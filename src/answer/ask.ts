import { appConfig } from "../config/env.js";
import { createContextLogger } from "../core/logger.js";
import { emitWebhookEvent } from "../core/webhook.js";
import { retrieveSourcesForQuestion } from "../retrieve/search.js";
import { buildGroundedAnswerInput } from "./prompt.js";
import { generateGroundedAnswer } from "./generate.js";

import type { AnswerOutput } from "./schema.js";

const validateCitations = (params: {
  sources: Array<{ sourceId: string; chunkId: string }>;
  output: AnswerOutput;
}) => {
  const sourceToChunk = new Map(params.sources.map((s) => [s.sourceId, s.chunkId] as const));

  for (const c of params.output.citations) {
    const expectedChunk = sourceToChunk.get(c.source_id);
    if (!expectedChunk) return false;
    if (expectedChunk !== c.chunk_id) return false;
  }

  return true;
};

export const answerQuestionWithGrounding = async (params: {
  docId: string;
  question: string;
}): Promise<{
  output: AnswerOutput;
  sources: Array<{ sourceId: string; chunkId: string; score: number }>;
  timings: { retrieval_ms: number; generation_ms: number };
}> => {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const contextualLogger = createContextLogger({ op: "ask", requestId, docId: params.docId });

  const retrieval = await retrieveSourcesForQuestion({
    docId: params.docId,
    question: params.question
  });

  if (appConfig.ENABLE_REFUSAL_GUARD && retrieval.sources.length === 0) {
    const refusal: AnswerOutput = {
      answer: "",
      citations: [],
      confidence: "low",
      refusal_reason: "No sufficiently relevant context was retrieved for this question."
    };

    await emitWebhookEvent("ask.completed", {
      doc_id: params.docId,
      refused: true,
      citations_count: 0
    });

    return {
      output: refusal,
      sources: [],
      timings: { retrieval_ms: retrieval.retrievalMs, generation_ms: 0 }
    };
  }

  const generationStart = Date.now();
  const input = buildGroundedAnswerInput({ question: params.question, sources: retrieval.sources });
  const output = await generateGroundedAnswer(input);
  const generationMs = Date.now() - generationStart;

  if (appConfig.ENABLE_CITATIONS) {
    const citationsValid = validateCitations({
      sources: retrieval.sources.map((s) => ({ sourceId: s.sourceId, chunkId: s.chunkId })),
      output
    });

    if (!citationsValid) {
      const refusal: AnswerOutput = {
        answer: "",
        citations: [],
        confidence: "low",
        refusal_reason: "Generated citations were invalid for the retrieved sources."
      };

      contextualLogger.warn("Invalid citations detected, returning refusal");

      await emitWebhookEvent("ask.completed", {
        doc_id: params.docId,
        refused: true,
        citations_count: 0
      });

      return {
        output: refusal,
        sources: retrieval.sources.map((s) => ({ sourceId: s.sourceId, chunkId: s.chunkId, score: s.score })),
        timings: { retrieval_ms: retrieval.retrievalMs, generation_ms: generationMs }
      };
    }
  }

  await emitWebhookEvent("ask.completed", {
    doc_id: params.docId,
    refused: Boolean(output.refusal_reason),
    citations_count: output.citations.length
  });

  return {
    output,
    sources: retrieval.sources.map((s) => ({ sourceId: s.sourceId, chunkId: s.chunkId, score: s.score })),
    timings: { retrieval_ms: retrieval.retrievalMs, generation_ms: generationMs }
  };
};
