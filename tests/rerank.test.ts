import { describe, expect, it } from "vitest";

import { rerankSourcesDeterministically } from "../src/retrieve/rerank.js";

describe("rerankSourcesDeterministically", () => {
  it("orders by token overlap then score then chunkIndex then chunkId", () => {
    const question = "refund policy deadline";
    const sources = [
      { chunkId: "b", score: 0.9, text: "This section describes the refund policy and deadline", source: "a.pdf", chunkIndex: 5 },
      { chunkId: "a", score: 0.95, text: "Refund policy is described here", source: "a.pdf", chunkIndex: 3 },
      { chunkId: "c", score: 0.99, text: "Unrelated content about onboarding", source: "a.pdf", chunkIndex: 1 }
    ];

    const reranked = rerankSourcesDeterministically({ question, sources });
    expect(reranked.map((s) => s.chunkId)).toEqual(["b", "a", "c"]);
  });

  it("is deterministic for equal overlap and score", () => {
    const question = "alpha beta";
    const sources = [
      { chunkId: "d", score: 0.5, text: "alpha beta", source: "x", chunkIndex: 2 },
      { chunkId: "c", score: 0.5, text: "alpha beta", source: "x", chunkIndex: 2 }
    ];

    const reranked = rerankSourcesDeterministically({ question, sources });
    expect(reranked.map((s) => s.chunkId)).toEqual(["c", "d"]);
  });
});
