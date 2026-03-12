import { appConfig } from "../config/env.js";
import { createEmbeddingVectors } from "../core/openai.js";
import { qdrantClient } from "../core/qdrant.js";
import { rerankSourcesDeterministically } from "./rerank.js";

export type RetrievedSource = {
  sourceId: string;
  chunkId: string;
  score: number;
  text: string;
  source: string;
  chunkIndex: number;
};

const parsePayloadString = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  return typeof value === "string" ? value : null;
};

const parsePayloadNumber = (payload: unknown, key: string) => {
  const record = payload as Record<string, unknown> | null;
  const value = record ? record[key] : undefined;
  return typeof value === "number" ? value : null;
};

const assignSourceIds = (sources: Array<Omit<RetrievedSource, "sourceId">>): RetrievedSource[] =>
  sources.map((s, index) => ({ ...s, sourceId: `S${index + 1}` }));

export const retrieveSourcesForQuestion = async (params: {
  docId: string;
  question: string;
  topK?: number;
  minScore?: number;
}): Promise<{ sources: RetrievedSource[]; retrievalMs: number }> => {
  const startedAt = Date.now();

  const topK = params.topK ?? appConfig.TOP_K;
  const minScore = params.minScore ?? appConfig.MIN_SCORE;

  const { vectors } = await createEmbeddingVectors([params.question]);
  const queryVector = vectors[0];
  if (!queryVector) {
    throw new Error("Failed to create query embedding vector");
  }

  const results = await qdrantClient.search(appConfig.QDRANT_COLLECTION, {
    vector: queryVector,
    limit: topK,
    score_threshold: minScore,
    with_vector: false,
    with_payload: ["doc_id", "chunk_id", "chunk_index", "source", "text"],
    filter: { must: [{ key: "doc_id", match: { value: params.docId } }] }
  });

  const mapped = results
    .map((point) => {
      const payload = (point as { payload?: unknown }).payload ?? null;
      const chunkId = parsePayloadString(payload, "chunk_id");
      const text = parsePayloadString(payload, "text");
      const source = parsePayloadString(payload, "source");
      const chunkIndex = parsePayloadNumber(payload, "chunk_index");
      const score = (point as { score?: unknown }).score;

      if (!chunkId || !text || !source || chunkIndex === null) return null;
      if (typeof score !== "number") return null;

      return { chunkId, score, text, source, chunkIndex };
    })
    .filter(
      (x): x is { chunkId: string; score: number; text: string; source: string; chunkIndex: number } => x !== null
    );

  const ordered = appConfig.RE_RANK ? rerankSourcesDeterministically({ question: params.question, sources: mapped }) : mapped;

  return { sources: assignSourceIds(ordered), retrievalMs: Date.now() - startedAt };
};
