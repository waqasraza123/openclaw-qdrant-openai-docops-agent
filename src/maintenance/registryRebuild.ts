import type { DocRegistryEntry } from "./docRegistry.js";
import type { ExportedChunkPayload } from "./docExport.js";

export type RegistryRebuildDocResult = {
  doc_id: string;
  chunk_count: number;
  scanned_points: number;
  updated: boolean;
  skipped_reason: string | null;
  error: string | null;
};

export type RegistryRebuildReport = {
  ok: boolean;
  started_at: string;
  finished_at: string;
  registry_collection: string;
  source_collection: string;
  docs_found: number;
  docs_processed: number;
  docs_updated: number;
  docs_skipped: number;
  docs_failed: number;
  results: RegistryRebuildDocResult[];
};

export type RegistryRebuildDependencies = {
  sourceCollectionName: string;
  registryCollectionName: string;
  embedModel: string;
  chunkMaxTokens: number;
  chunkOverlapTokens: number;
  nowIso: () => string;
  sha256Hex: (input: string) => string;
  ensureRegistryCollection: () => Promise<void>;
  listDocIds: (params: { maxPointsToScan: number; pageSize: number }) => Promise<{ docIds: string[]; scannedPoints: number }>;
  exportChunks: (params: { docId: string; maxChunks: number; pageSize: number }) => Promise<{ chunks: ExportedChunkPayload[]; scannedPoints: number }>;
  upsertRegistryEntry: (entry: DocRegistryEntry) => Promise<void>;
};

const stringifyError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const orderChunks = (chunks: ExportedChunkPayload[]) =>
  [...chunks].sort((a, b) => {
    if (a.chunk_index != b.chunk_index) return a.chunk_index - b.chunk_index;
    return a.chunk_id.localeCompare(b.chunk_id);
  });

const deriveContentHashFromChunkIds = (chunks: ExportedChunkPayload[], sha256Hex: (input: string) => string) => {
  const ordered = orderChunks(chunks);
  const joined = ordered.map((c) => c.chunk_id).join("\n");
  return sha256Hex(joined);
};

const chooseSource = (chunks: ExportedChunkPayload[]) => {
  if (chunks.length == 0) return "unknown";
  const first = orderChunks(chunks)[0];
  return first.source && first.source.trim().length > 0 ? first.source : "unknown";
};

const buildRegistryEntry = (params: {
  docId: string;
  source: string;
  chunkCount: number;
  contentHash: string;
  embedModel: string;
  chunkMaxTokens: number;
  chunkOverlapTokens: number;
  nowIso: string;
}): DocRegistryEntry => {
  return {
    doc_id: params.docId,
    source: params.source,
    page_count: null,
    chunk_count: params.chunkCount,
    content_hash: params.contentHash,
    embed_model: params.embedModel,
    chunk_max_tokens: params.chunkMaxTokens,
    chunk_overlap_tokens: params.chunkOverlapTokens,
    created_at: params.nowIso,
    updated_at: params.nowIso
  };
};

export const rebuildDocRegistry = async (deps: RegistryRebuildDependencies, params: {
  maxScanPoints: number;
  listPageSize: number;
  maxDocs: number;
  maxChunksPerDoc: number;
  chunksPageSize: number;
  dryRun: boolean;
}): Promise<RegistryRebuildReport> => {
  const startedAt = deps.nowIso();
  await deps.ensureRegistryCollection();

  const listResult = await deps.listDocIds({ maxPointsToScan: params.maxScanPoints, pageSize: params.listPageSize });
  const docIds = listResult.docIds.slice(0, params.maxDocs);

  const results: RegistryRebuildDocResult[] = [];
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const docId of docIds) {
    try {
      const exported = await deps.exportChunks({ docId, maxChunks: params.maxChunksPerDoc, pageSize: params.chunksPageSize });
      if (exported.chunks.length == 0) {
        skippedCount += 1;
        results.push({
          doc_id: docId,
          chunk_count: 0,
          scanned_points: exported.scannedPoints,
          updated: false,
          skipped_reason: "No chunks found for doc_id",
          error: null
        });
        continue;
      }

      const nowIso = deps.nowIso();
      const contentHash = deriveContentHashFromChunkIds(exported.chunks, deps.sha256Hex);
      const entry = buildRegistryEntry({
        docId,
        source: chooseSource(exported.chunks),
        chunkCount: exported.chunks.length,
        contentHash,
        embedModel: deps.embedModel,
        chunkMaxTokens: deps.chunkMaxTokens,
        chunkOverlapTokens: deps.chunkOverlapTokens,
        nowIso
      });

      if (!params.dryRun) {
        await deps.upsertRegistryEntry(entry);
      }

      updatedCount += 1;
      results.push({
        doc_id: docId,
        chunk_count: exported.chunks.length,
        scanned_points: exported.scannedPoints,
        updated: true,
        skipped_reason: null,
        error: null
      });
    } catch (error) {
      failedCount += 1;
      results.push({
        doc_id: docId,
        chunk_count: 0,
        scanned_points: 0,
        updated: false,
        skipped_reason: null,
        error: stringifyError(error)
      });
    }
  }

  const finishedAt = deps.nowIso();
  const ok = failedCount == 0;

  return {
    ok,
    started_at: startedAt,
    finished_at: finishedAt,
    registry_collection: deps.registryCollectionName,
    source_collection: deps.sourceCollectionName,
    docs_found: listResult.docIds.length,
    docs_processed: docIds.length,
    docs_updated: updatedCount,
    docs_skipped: skippedCount,
    docs_failed: failedCount,
    results
  };
};
