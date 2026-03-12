import { describe, expect, it } from "vitest";

import { RetrieveRequestSchema } from "../src/web/schemas.js";

describe("RetrieveRequestSchema", () => {
  it("defaults include_text to false", () => {
    const parsed = RetrieveRequestSchema.parse({ doc_id: "d1", question: "q" });
    expect(parsed.include_text).toBe(false);
  });

  it("coerces numeric overrides", () => {
    const parsed = RetrieveRequestSchema.parse({ doc_id: "d1", question: "q", top_k: "5", min_score: "0.3" });
    expect(parsed.top_k).toBe(5);
    expect(parsed.min_score).toBe(0.3);
  });
});
