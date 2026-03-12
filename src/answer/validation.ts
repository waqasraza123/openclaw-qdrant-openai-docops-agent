import type { AnswerOutput } from "./schema.js";

export const validateCitationsMapping = (params: {
  sources: Array<{ sourceId: string; chunkId: string }>;
  output: AnswerOutput;
}): boolean => {
  const sourceToChunk = new Map(params.sources.map((s) => [s.sourceId, s.chunkId] as const));

  for (const citation of params.output.citations) {
    const expectedChunkId = sourceToChunk.get(citation.source_id);
    if (!expectedChunkId) return false;
    if (expectedChunkId !== citation.chunk_id) return false;
  }

  return true;
};
