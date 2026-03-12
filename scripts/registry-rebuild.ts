import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { sha256Hex } from "../src/core/ids.js";
import { exportChunksForDocId } from "../src/maintenance/docExport.js";
import { ensureDocRegistryCollection, upsertDocRegistryEntry } from "../src/maintenance/docRegistry.js";
import { listDocIdsInCollection } from "../src/maintenance/docList.js";
import { getDocRegistryCollectionName } from "../src/maintenance/registryNaming.js";
import { rebuildDocRegistry } from "../src/maintenance/registryRebuild.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index == -1) return null;
  const value = args[index + 1];
  return typeof value == "string" && value.trim().length > 0 ? value.trim() : null;
};

const parsePositiveInt = (value: string, fieldName: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(fieldName + " must be a positive integer");
  return parsed;
};

const parseBoolean = (value: string | null) => value == "true";

const run = async () => {
  const args = process.argv.slice(2);

  const maxScanPoints = getArgValue(args, "--max-scan-points");
  const listPageSize = getArgValue(args, "--list-page-size");
  const maxDocs = getArgValue(args, "--max-docs");
  const maxChunksPerDoc = getArgValue(args, "--max-chunks");
  const chunksPageSize = getArgValue(args, "--chunks-page-size");
  const dryRun = parseBoolean(getArgValue(args, "--dry-run"));

  const resolvedMaxScanPoints = maxScanPoints ? parsePositiveInt(maxScanPoints, "max-scan-points") : 200000;
  const resolvedListPageSize = listPageSize
    ? parsePositiveInt(listPageSize, "list-page-size")
    : appConfig.QDRANT_BATCH_SIZE;
  const resolvedMaxDocs = maxDocs ? parsePositiveInt(maxDocs, "max-docs") : 1000;
  const resolvedMaxChunksPerDoc = maxChunksPerDoc
    ? parsePositiveInt(maxChunksPerDoc, "max-chunks")
    : appConfig.MAX_CHUNKS_PER_DOC;
  const resolvedChunksPageSize = chunksPageSize
    ? parsePositiveInt(chunksPageSize, "chunks-page-size")
    : appConfig.QDRANT_BATCH_SIZE;

  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);

  const report = await rebuildDocRegistry(
    {
      sourceCollectionName: appConfig.QDRANT_COLLECTION,
      registryCollectionName,
      embedModel: appConfig.OPENAI_EMBED_MODEL,
      chunkMaxTokens: appConfig.CHUNK_MAX_TOKENS,
      chunkOverlapTokens: appConfig.CHUNK_OVERLAP_TOKENS,
      nowIso: () => new Date().toISOString(),
      sha256Hex,
      ensureRegistryCollection: async () => await ensureDocRegistryCollection({ registryCollectionName }),
      listDocIds: async (p) =>
        await listDocIdsInCollection({
          collectionName: appConfig.QDRANT_COLLECTION,
          maxPointsToScan: p.maxPointsToScan,
          pageSize: p.pageSize
        }),
      exportChunks: async (p) =>
        await exportChunksForDocId({
          collectionName: appConfig.QDRANT_COLLECTION,
          docId: p.docId,
          maxChunks: p.maxChunks,
          pageSize: p.pageSize
        }),
      upsertRegistryEntry: async (entry) => await upsertDocRegistryEntry({ registryCollectionName, entry })
    },
    {
      maxScanPoints: resolvedMaxScanPoints,
      listPageSize: resolvedListPageSize,
      maxDocs: resolvedMaxDocs,
      maxChunksPerDoc: resolvedMaxChunksPerDoc,
      chunksPageSize: resolvedChunksPageSize,
      dryRun
    }
  );

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.ok) process.exitCode = 1;
};

run().catch((error) => {
  logger.error({ err: error }, "Registry rebuild failed");
  process.exitCode = 1;
});
