import { describe, expect, it, vi } from "vitest";

describe("answerQuestionWithGrounding trace", () => {
  it("returns trace when includeTrace is true", async () => {
    vi.resetModules();

    vi.doMock("../src/config/env.js", () => ({
      appConfig: {
        ENABLE_REFUSAL_GUARD: false,
        ENABLE_CITATIONS: false
      }
    }));

    vi.doMock("../src/core/logger.js", () => ({
      createContextLogger: () => ({ info: () => undefined, warn: () => undefined })
    }));

    vi.doMock("../src/core/webhook.js", () => ({
      emitWebhookEvent: async () => undefined
    }));

    vi.doMock("../src/retrieve/search.js", () => ({
      retrieveSourcesForQuestion: async () => ({
        retrievalMs: 1,
        sources: [
          {
            sourceId: "S1",
            chunkId: "c1",
            score: 0.9,
            text: "hello",
            source: "file.pdf",
            chunkIndex: 1
          }
        ]
      })
    }));

    vi.doMock("../src/answer/prompt.js", () => ({
      buildGroundedAnswerInput: () => ({ kind: "prompt", value: "x" })
    }));

    vi.doMock("../src/answer/generate.js", () => ({
      generateGroundedAnswer: async () => ({ answer: "a", citations: [], confidence: "low" })
    }));

    const moduleValue = await import("../src/answer/ask.js");
    const result = await moduleValue.answerQuestionWithGrounding({
      docId: "d1",
      question: "q",
      requestId: "req1",
      includeTrace: true
    });

    expect(result.trace?.request_id).toBe("req1");
    expect(Array.isArray(result.trace?.retrieved_sources)).toBe(true);
    expect(result.trace?.retrieved_sources.length).toBe(1);
  });
});
