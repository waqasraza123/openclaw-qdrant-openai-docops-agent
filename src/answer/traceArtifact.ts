import fs from "node:fs/promises";
import path from "node:path";

export type AskTracePayload = {
  request_id: string;
  prompt_input: unknown;
  retrieved_sources: Array<{
    sourceId: string;
    chunkId: string;
    score: number;
    text: string;
    source: string;
    chunkIndex: number;
  }>;
};

export type AskTraceArtifact = {
  request_id: string;
  doc_id: string;
  question: string;
  created_at: string;
  model: string;
  embed_model: string;
  qdrant_collection: string;
  prompt_input: unknown;
  retrieved_sources: AskTracePayload["retrieved_sources"];
  output: unknown;
  sources: Array<{ sourceId: string; chunkId: string; score: number }>;
  timings: { retrieval_ms: number; generation_ms: number };
};

export const sanitizeTraceId = (traceId: string) => traceId.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);

export const getDefaultTraceDirectory = (cacheDir: string) => path.join(path.dirname(cacheDir), "traces");

export const buildAskTraceArtifact = (params: {
  trace: AskTracePayload;
  docId: string;
  question: string;
  createdAtIso: string;
  model: string;
  embedModel: string;
  qdrantCollection: string;
  output: unknown;
  sources: Array<{ sourceId: string; chunkId: string; score: number }>;
  timings: { retrieval_ms: number; generation_ms: number };
}): AskTraceArtifact => {
  return {
    request_id: params.trace.request_id,
    doc_id: params.docId,
    question: params.question,
    created_at: params.createdAtIso,
    model: params.model,
    embed_model: params.embedModel,
    qdrant_collection: params.qdrantCollection,
    prompt_input: params.trace.prompt_input,
    retrieved_sources: params.trace.retrieved_sources,
    output: params.output,
    sources: params.sources,
    timings: params.timings
  };
};

export const persistAskTraceArtifact = async (params: {
  artifact: AskTraceArtifact;
  directoryPath: string;
}): Promise<string> => {
  await fs.mkdir(params.directoryPath, { recursive: true });
  const safeId = sanitizeTraceId(params.artifact.doc_id + "-" + params.artifact.request_id);
  const filePath = path.join(params.directoryPath, safeId + ".json");
  await fs.writeFile(filePath, JSON.stringify(params.artifact, null, 2), "utf8");
  return filePath;
};
