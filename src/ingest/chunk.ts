import path from "node:path";

import { appConfig } from "../config/env.js";
import { sha256Hex } from "../core/ids.js";
import { chunkTextByEmbeddingTokens } from "../core/tokenizer.js";

export type TextChunk = {
  docId: string;
  chunkId: string;
  chunkIndex: number;
  tokenCount: number;
  source: string;
  text: string;
};

const normalizeChunkText = (text: string) => text.replace(/\s+/g, " ").trim();

export const createDocumentChunks = (params: {
  docId: string;
  sourcePath: string;
  fullText: string;
}): TextChunk[] => {
  const { docId, sourcePath, fullText } = params;

  const source = path.basename(sourcePath);
  const normalizedText = fullText.trim();

  const rawChunks = chunkTextByEmbeddingTokens({
    text: normalizedText,
    maxTokens: appConfig.CHUNK_MAX_TOKENS,
    overlapTokens: appConfig.CHUNK_OVERLAP_TOKENS,
    maxChunks: appConfig.MAX_CHUNKS_PER_DOC
  });

  const chunks: TextChunk[] = rawChunks.map((chunk) => {
    const cleanText = normalizeChunkText(chunk.text);
    const stableIdInput = `${docId}|${chunk.chunkIndex}|${cleanText}`;
    const chunkId = sha256Hex(stableIdInput);

    return {
      docId,
      chunkId,
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.tokenCount,
      source,
      text: cleanText
    };
  });

  if (chunks.length === 0) {
    throw new Error("Chunking produced zero chunks");
  }

  return chunks;
};
