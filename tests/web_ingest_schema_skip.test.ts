import { describe, expect, it } from "vitest";

import { IngestRequestSchema } from "../src/web/schemas.js";

describe("IngestRequestSchema skip_unchanged", () => {
  it("defaults skip_unchanged to false", () => {
    const parsed = IngestRequestSchema.parse({ doc_id: "d1", pdf_path: "/tmp/a.pdf" });
    expect(parsed.skip_unchanged).toBe(false);
  });

  it("accepts skip_unchanged true", () => {
    const parsed = IngestRequestSchema.parse({ doc_id: "d1", pdf_path: "/tmp/a.pdf", skip_unchanged: true });
    expect(parsed.skip_unchanged).toBe(true);
  });
});
