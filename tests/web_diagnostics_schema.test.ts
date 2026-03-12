import { describe, expect, it } from "vitest";

import { DiagnosticsRunRequestSchema } from "../src/web/schemas.js";

describe("DiagnosticsRunRequestSchema", () => {
  it("defaults include_openai to false", () => {
    const parsed = DiagnosticsRunRequestSchema.parse({});
    expect(parsed.include_openai).toBe(false);
  });

  it("accepts include_openai true", () => {
    const parsed = DiagnosticsRunRequestSchema.parse({ include_openai: true });
    expect(parsed.include_openai).toBe(true);
  });
});
