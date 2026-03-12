import { appConfig } from "../config/env.js";
import { ensureQdrantCollection, qdrantClient } from "../core/qdrant.js";

import type { EmbeddedChunk } from "./embed.js";

export const upsertEmbeddedChunks = async (params: {
  collectionName: string;
  embeddedChunks: EmbeddedChunk[];
}): Promise<{ upsertedCount: number; vectorSize: number }> => {
  const { collectionName, embeddedChunks } = params;

  if (embeddedChunks.length === 0) {
    throw new Error("No embedded chunks to upsert");
  }

  const firstChunk = embeddedChunks[0];
  if (!firstChunk) {
    throw new Error("No embedded chunks to upsert");
  }

  const vectorSize = firstChunk.vector.length;
  if (vectorSize <= 0) {
    throw new Error("Invalid embedding vector size");
  }

  for (const item of embeddedChunks) {
    if (item.vector.length !== vectorSize) {
      throw new Error("Embedding vector size mismatch within batch");
    }
  }

  await ensureQdrantCollection({ collectionName, vectorSize });

  let upsertedCount = 0;

  for (let i = 0; i < embeddedChunks.length; i += appConfig.QDRANT_BATCH_SIZE) {
    const batch = embeddedChunks.slice(i, i + appConfig.QDRANT_BATCH_SIZE);

    await qdrantClient.upsert(collectionName, {
      wait: true,
      points: batch.map((chunk) => ({
        id: chunk.chunkId,
        vector: chunk.vector,
        payload: {
          doc_id: chunk.docId,
          chunk_id: chunk.chunkId,
          chunk_index: chunk.chunkIndex,
          token_count: chunk.tokenCount,
          source: chunk.source,
          text: chunk.text,
          created_at: new Date().toISOString()
        }
      }))
    });

    upsertedCount += batch.length;
  }

  return { upsertedCount, vectorSize };
};
