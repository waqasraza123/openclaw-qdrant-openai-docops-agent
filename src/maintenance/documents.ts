import { appConfig } from "../config/env.js";
import { qdrantClient } from "../core/qdrant.js";

export type QdrantDocumentsClient = {
  count: (collectionName: string, params: unknown) => Promise<unknown>;
  delete: (collectionName: string, params: unknown) => Promise<unknown>;
};

export const countChunksForDocId = async (
  docId: string,
  options?: { collectionName?: string; client?: QdrantDocumentsClient }
): Promise<number> => {
  const client = options?.client ?? (qdrantClient as unknown as QdrantDocumentsClient);
  const collectionName = options?.collectionName ?? appConfig.QDRANT_COLLECTION;

  const result = await client.count(collectionName, {
    exact: true,
    filter: { must: [{ key: "doc_id", match: { value: docId } }] }
  });

  const count = (result as { count?: unknown }).count;
  if (typeof count !== "number") throw new Error("Unexpected Qdrant count response");

  return count;
};

export const deleteChunksForDocId = async (
  docId: string,
  options?: { collectionName?: string; client?: QdrantDocumentsClient }
): Promise<void> => {
  const client = options?.client ?? (qdrantClient as unknown as QdrantDocumentsClient);
  const collectionName = options?.collectionName ?? appConfig.QDRANT_COLLECTION;

  await client.delete(collectionName, {
    wait: true,
    filter: { must: [{ key: "doc_id", match: { value: docId } }] }
  });
};
