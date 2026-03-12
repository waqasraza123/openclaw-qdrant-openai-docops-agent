import path from "node:path";

import type { DocRegistryEntry } from "../maintenance/docRegistry.js";

export const computeDocumentContentHash = (text: string, sha256Hex: (input: string) => string) =>
  sha256Hex(text);

export const resolveRegistryTimestamps = (params: {
  existingCreatedAtIso: string | null;
  nowIso: string;
}): { createdAtIso: string; updatedAtIso: string } => {
  const createdAtIso = params.existingCreatedAtIso ? params.existingCreatedAtIso : params.nowIso;
  return { createdAtIso, updatedAtIso: params.nowIso };
};

export const buildDocRegistryEntry = (params: {
  docId: string;
  sourcePath: string;
  pageCount: number | null;
  chunkCount: number;
  contentHash: string;
  embedModel: string;
  chunkMaxTokens: number;
  chunkOverlapTokens: number;
  createdAtIso: string;
  updatedAtIso: string;
}): DocRegistryEntry => {
  if (params.docId.trim().length === 0) throw new Error("docId is required");
  if (params.chunkCount < 0) throw new Error("chunkCount must be >= 0");
  if (params.pageCount !== null && params.pageCount < 0) throw new Error("pageCount must be >= 0");

  return {
    doc_id: params.docId,
    source: path.basename(params.sourcePath),
    page_count: params.pageCount,
    chunk_count: params.chunkCount,
    content_hash: params.contentHash,
    embed_model: params.embedModel,
    chunk_max_tokens: params.chunkMaxTokens,
    chunk_overlap_tokens: params.chunkOverlapTokens,
    created_at: params.createdAtIso,
    updated_at: params.updatedAtIso
  };
};
