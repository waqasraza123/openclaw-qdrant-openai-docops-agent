import { qdrantClient } from "../core/qdrant.js";

export type ExportedChunkPayload = {
  doc_id: string;
  chunk_id: string;
  chunk_index: number;
  token_count: number;
  source: string;
  text: string;
  created_at: string;
};

export type QdrantDocExportClient = {
  scroll: (collectionName: string, params: unknown) => Promise<unknown>;
};

const parsePayloadString = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  return typeof value === "string" ? value : null;
};

const parsePayloadNumber = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  return typeof value === "number" ? value : null;
};

const parseScrollPoints = (response: unknown) => {
  const record = response as Record<string, unknown> | null;
  const points = record ? record["points"] : undefined;
  if (!Array.isArray(points)) return [];
  return points as unknown[];
};

const parseNextPageOffset = (response: unknown) => {
  const record = response as Record<string, unknown> | null;
  const value = record ? record["next_page_offset"] : undefined;
  if (value === undefined || value === null) return null;
  return value;
};

const parseChunkPayload = (payload: unknown): ExportedChunkPayload | null => {
  const doc_id = parsePayloadString(payload, "doc_id");
  const chunk_id = parsePayloadString(payload, "chunk_id");
  const source = parsePayloadString(payload, "source");
  const text = parsePayloadString(payload, "text");
  const created_at = parsePayloadString(payload, "created_at");
  const chunk_index = parsePayloadNumber(payload, "chunk_index");
  const token_count = parsePayloadNumber(payload, "token_count");

  if (!doc_id || !chunk_id || !source || !text || !created_at) return null;
  if (chunk_index === null || token_count === null) return null;

  return { doc_id, chunk_id, chunk_index, token_count, source, text, created_at };
};

export const exportChunksForDocId = async (params: {
  collectionName: string;
  docId: string;
  maxChunks: number;
  pageSize: number;
  client?: QdrantDocExportClient;
}): Promise<{ chunks: ExportedChunkPayload[]; scannedPoints: number }> => {
  if (params.maxChunks <= 0) throw new Error("maxChunks must be > 0");
  if (params.pageSize <= 0) throw new Error("pageSize must be > 0");

  const client = params.client ?? (qdrantClient as unknown as QdrantDocExportClient);

  const chunkById = new Map<string, ExportedChunkPayload>();
  let scannedPoints = 0;
  let offset: unknown | null = null;

  while (chunkById.size < params.maxChunks) {
    const remaining = params.maxChunks - chunkById.size;
    const limit = Math.min(params.pageSize, remaining);

    const response = await client.scroll(params.collectionName, {
      limit,
      offset: offset ?? undefined,
      with_payload: ["doc_id", "chunk_id", "chunk_index", "token_count", "source", "text", "created_at"],
      with_vector: false,
      filter: { must: [{ key: "doc_id", match: { value: params.docId } }] }
    });

    const points = parseScrollPoints(response);
    const processedPoints = points.slice(0, limit);
    if (processedPoints.length == 0) break;

    for (const point of processedPoints) {
      const payload = (point as { payload?: unknown } | null)?.payload ?? null;
      const parsedPayload = parseChunkPayload(payload);
      if (!parsedPayload) continue;
      if (parsedPayload.doc_id !== params.docId) continue;
      if (!chunkById.has(parsedPayload.chunk_id)) {
        chunkById.set(parsedPayload.chunk_id, parsedPayload);
      }
    }

    scannedPoints += processedPoints.length;

    const nextOffset = parseNextPageOffset(response);
    if (nextOffset === null) break;
    offset = nextOffset;
  }

  const chunks = Array.from(chunkById.values()).sort((a, b) => {
    if (a.chunk_index !== b.chunk_index) return a.chunk_index - b.chunk_index;
    return a.chunk_id.localeCompare(b.chunk_id);
  });

  return { chunks, scannedPoints };
};
