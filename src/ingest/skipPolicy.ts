import type { DocRegistryEntry } from "../maintenance/docRegistry.js";

export type SkipDecision = {
  should_skip: boolean;
  reason: string | null;
};

export const evaluateSkipUnchangedIngest = (params: {
  skipRequested: boolean;
  replaceRequested: boolean;
  existingEntry: DocRegistryEntry | null;
  contentHash: string;
  embedModel: string;
  chunkMaxTokens: number;
  chunkOverlapTokens: number;
}): SkipDecision => {
  if (!params.skipRequested) return { should_skip: false, reason: null };
  if (params.replaceRequested) return { should_skip: false, reason: null };
  if (!params.existingEntry) return { should_skip: false, reason: null };
  if (params.existingEntry.chunk_count <= 0) return { should_skip: false, reason: null };

  const hashMatches = params.existingEntry.content_hash === params.contentHash;
  const modelMatches = params.existingEntry.embed_model === params.embedModel;
  const chunkMaxMatches = params.existingEntry.chunk_max_tokens === params.chunkMaxTokens;
  const chunkOverlapMatches = params.existingEntry.chunk_overlap_tokens === params.chunkOverlapTokens;

  if (!hashMatches || !modelMatches || !chunkMaxMatches || !chunkOverlapMatches) {
    return { should_skip: false, reason: null };
  }

  return { should_skip: true, reason: "Doc unchanged; skipping re-ingest" };
};
