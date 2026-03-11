import { appConfig } from "../config/env.js";
import { qdrantClient } from "../core/qdrant.js";

export const countChunksForDocId = async (docId: string): Promise<number> => {
  const result = await qdrantClient.count(appConfig.QDRANT_COLLECTION, {
    exact: true,
    filter: { must: [{ key: "doc_id", match: { value: docId } }] }
  });

  const count = (result as { count?: unknown }).count;
  if (typeof count !== "number") {
    throw new Error("Unexpected Qdrant count response");
  }

  return count;
};

export const deleteChunksForDocId = async (docId: string): Promise<void> => {
  await qdrantClient.delete(appConfig.QDRANT_COLLECTION, {
    wait: true,
    filter: { must: [{ key: "doc_id", match: { value: docId } }] }
  });
};
