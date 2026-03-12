import type { RetrievedSource } from "./search.js";

export type RetrieveResponseSource = {
  source_id: string;
  chunk_id: string;
  score: number;
  source: string;
  chunk_index: number;
  text?: string;
};

export const formatRetrievedSources = (params: {
  sources: RetrievedSource[];
  includeText: boolean;
}): RetrieveResponseSource[] => {
  if (params.includeText) {
    return params.sources.map((s) => ({
      source_id: s.sourceId,
      chunk_id: s.chunkId,
      score: s.score,
      source: s.source,
      chunk_index: s.chunkIndex,
      text: s.text
    }));
  }

  return params.sources.map((s) => ({
    source_id: s.sourceId,
    chunk_id: s.chunkId,
    score: s.score,
    source: s.source,
    chunk_index: s.chunkIndex
  }));
};
