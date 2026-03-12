import { describe, expect, it } from "vitest";

import { validateCitationsMapping } from "../src/answer/validation.js";

describe("validateCitationsMapping", () => {
  it("accepts correct mapping", () => {
    const ok = validateCitationsMapping({
      sources: [
        { sourceId: "S1", chunkId: "c1" },
        { sourceId: "S2", chunkId: "c2" }
      ],
      output: {
        answer: "x",
        citations: [
          { source_id: "S1", chunk_id: "c1" },
          { source_id: "S2", chunk_id: "c2" }
        ],
        confidence: "medium"
      }
    });
    expect(ok).toBe(true);
  });

  it("rejects unknown source_id", () => {
    const ok = validateCitationsMapping({
      sources: [{ sourceId: "S1", chunkId: "c1" }],
      output: {
        answer: "x",
        citations: [{ source_id: "S2", chunk_id: "c2" }],
        confidence: "low"
      }
    });
    expect(ok).toBe(false);
  });

  it("rejects wrong chunk_id for a known source_id", () => {
    const ok = validateCitationsMapping({
      sources: [{ sourceId: "S1", chunkId: "c1" }],
      output: {
        answer: "x",
        citations: [{ source_id: "S1", chunk_id: "c2" }],
        confidence: "high"
      }
    });
    expect(ok).toBe(false);
  });
});
