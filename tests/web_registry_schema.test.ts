import { describe, expect, it } from "vitest";

import { RegistryGetRequestSchema, RegistryListRequestSchema } from "../src/web/schemas.js";

describe("registry request schemas", () => {
  it("validates registry get", () => {
    const parsed = RegistryGetRequestSchema.parse({ doc_id: "doc_1" });
    expect(parsed.doc_id).toBe("doc_1");
  });

  it("defaults registry list optional fields", () => {
    const parsed = RegistryListRequestSchema.parse({});
    expect(parsed.max_docs).toBeUndefined();
    expect(parsed.page_size).toBeUndefined();
  });

  it("coerces registry list numeric fields", () => {
    const parsed = RegistryListRequestSchema.parse({ max_docs: "10", page_size: "5" });
    expect(parsed.max_docs).toBe(10);
    expect(parsed.page_size).toBe(5);
  });
});
