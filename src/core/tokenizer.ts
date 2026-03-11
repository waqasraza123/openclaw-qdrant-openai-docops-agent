import { getEncoding } from "js-tiktoken";

const embeddingEncoding = getEncoding("cl100k_base");

export const countEmbeddingTokens = (text: string) => embeddingEncoding.encode(text).length;

export const chunkTextByEmbeddingTokens = (params: {
  text: string;
  maxTokens: number;
  overlapTokens: number;
  maxChunks: number;
}): { chunkIndex: number; tokenCount: number; text: string }[] => {
  const { text, maxTokens, overlapTokens, maxChunks } = params;

  if (maxTokens <= 0) throw new Error("maxTokens must be > 0");
  if (overlapTokens < 0) throw new Error("overlapTokens must be >= 0");
  if (overlapTokens >= maxTokens) throw new Error("overlapTokens must be < maxTokens");

  const tokens = embeddingEncoding.encode(text);
  if (tokens.length === 0) return [];

  const step = maxTokens - overlapTokens;

  const chunks: { chunkIndex: number; tokenCount: number; text: string }[] = [];
  let chunkIndex = 0;

  for (let start = 0; start < tokens.length; start += step) {
    if (chunks.length >= maxChunks) break;

    const slice = tokens.slice(start, start + maxTokens);
    const decoded = embeddingEncoding.decode(slice).trim();

    if (decoded.length === 0) continue;

    chunks.push({ chunkIndex, tokenCount: slice.length, text: decoded });
    chunkIndex += 1;
  }

  return chunks;
};
