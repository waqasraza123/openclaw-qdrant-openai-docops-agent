import { appConfig } from "../config/env.js";
import { qdrantClient } from "../core/qdrant.js";

export type StoredChunkPayload = {
  doc_id: string;
  chunk_id: string;
  chunk_index: number;
  token_count: number;
  source: string;
  text: string;
  created_at: string;
};

export type QdrantChunksClient = {
  retrieve: (collectionName: string, params: unknown) => Promise<unknown>;
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

export const getChunkForDocIdByChunkId = async (
  params: { docId: string; chunkId: string },
  options?: { collectionName?: string; client?: QdrantChunksClient }
): Promise<StoredChunkPayload | null> => {
  const client = options?.client ?? (qdrantClient as unknown as QdrantChunksClient);
  const collectionName = options?.collectionName ?? appConfig.QDRANT_COLLECTION;

  const points = await client.retrieve(collectionName, {
    ids: [params.chunkId],
    with_payload: true,
    with_vector: false
  });

  if (!Array.isArray(points) || points.length === 0) return null;

  const point = points[0] as { payload?: unknown } | null;
  const payload = point?.payload ?? null;

  const doc_id = parsePayloadString(payload, "doc_id");
  const chunk_id = parsePayloadString(payload, "chunk_id");
  const source = parsePayloadString(payload, "source");
  const text = parsePayloadString(payload, "text");
  const created_at = parsePayloadString(payload, "created_at");
  const chunk_index = parsePayloadNumber(payload, "chunk_index");
  const token_count = parsePayloadNumber(payload, "token_count");

  if (!doc_id || !chunk_id || !source || !text || !created_at) return null;
  if (chunk_index === null || token_count === null) return null;
  if (doc_id !== params.docId) return null;
  if (chunk_id !== params.chunkId) return null;

  return { doc_id, chunk_id, chunk_index, token_count, source, text, created_at };
};
