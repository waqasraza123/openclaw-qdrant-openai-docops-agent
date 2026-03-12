import { describe, expect, it } from "vitest";

import { AskRequestSchema } from "../src/web/schemas.js";

describe("AskRequestSchema trace", () => {
  it("defaults trace to false", () => {
    const parsed = AskRequestSchema.parse({ doc_id: "d1", question: "q" });
    expect(parsed.trace).toBe(false);
  });

  it("accepts trace true", () => {
    const parsed = AskRequestSchema.parse({ doc_id: "d1", question: "q", trace: true });
    expect(parsed.trace).toBe(true);
  });
});
