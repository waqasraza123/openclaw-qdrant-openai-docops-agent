import { appConfig } from "../config/env.js";
import { readCacheValue, writeCacheValue } from "../core/cache.js";
import { sha256Hex } from "../core/ids.js";
import { countEmbeddingTokens } from "../core/tokenizer.js";
import { createEmbeddingVectors } from "../core/openai.js";

import type { TextChunk } from "./chunk.js";

export type EmbeddedChunk = TextChunk & {
  vector: number[];
};

const maxEmbeddingTokensPerInput = 8192;
const maxEmbeddingTokensPerRequest = 300000;

const cacheKeyForEmbedding = (model: string, text: string) => sha256Hex(`${model}|${text}`);

export const embedChunks = async (chunks: TextChunk[]): Promise<{
  embeddedChunks: EmbeddedChunk[];
  cacheHitCount: number;
  embeddedCount: number;
}> => {
  const embeddedChunks: EmbeddedChunk[] = [];
  let cacheHitCount = 0;

  const missing: { chunk: TextChunk; cacheKey: string }[] = [];

  for (const chunk of chunks) {
    if (chunk.tokenCount > maxEmbeddingTokensPerInput) {
      throw new Error(`Chunk tokenCount exceeds embedding limit: ${chunk.tokenCount} > ${maxEmbeddingTokensPerInput}`);
    }

    const cacheKey = cacheKeyForEmbedding(appConfig.OPENAI_EMBED_MODEL, chunk.text);
    const cached = await readCacheValue<number[]>(cacheKey);

    if (cached) {
      embeddedChunks.push({ ...chunk, vector: cached });
      cacheHitCount += 1;
      continue;
    }

    missing.push({ chunk, cacheKey });
  }

  if (missing.length === 0) {
    return { embeddedChunks, cacheHitCount, embeddedCount: 0 };
  }

  let embeddedCount = 0;
  let index = 0;

  while (index < missing.length) {
    const batch: { chunk: TextChunk; cacheKey: string }[] = [];
    let tokenSum = 0;

    while (index < missing.length && batch.length < appConfig.QDRANT_BATCH_SIZE) {
      const candidate = missing[index];
      const candidateTokens = countEmbeddingTokens(candidate.chunk.text);

      if (candidateTokens > maxEmbeddingTokensPerInput) {
        throw new Error(`Chunk token count exceeds embedding model limit: ${candidateTokens} > ${maxEmbeddingTokensPerInput}`);
      }

      if (batch.length > 0 && tokenSum + candidateTokens > maxEmbeddingTokensPerRequest) {
        break;
      }

      tokenSum += candidateTokens;
      batch.push(candidate);
      index += 1;
    }

    const inputs = batch.map((b) => b.chunk.text);
    const { vectors } = await createEmbeddingVectors(inputs);

    for (let i = 0; i < batch.length; i += 1) {
      const item = batch[i];
      const vector = vectors[i];
      await writeCacheValue(item.cacheKey, vector);
      embeddedChunks.push({ ...item.chunk, vector });
      embeddedCount += 1;
    }
  }

  return { embeddedChunks, cacheHitCount, embeddedCount };
};
