import { describe, expect, it } from "vitest";

import { ChunkIdSchema } from "../src/web/schemas.js";

describe("ChunkIdSchema", () => {
  it("accepts lowercase sha256 hex", () => {
    const valid = "a".repeat(64);
    expect(ChunkIdSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-hex or wrong length", () => {
    const invalid = [
      "",
      "a",
      "A".repeat(64),
      "g".repeat(64),
      "a".repeat(63),
      "a".repeat(65),
      "deadbeef",
      `${"a".repeat(63)}z`
    ];

    for (const value of invalid) {
      expect(ChunkIdSchema.safeParse(value).success).toBe(false);
    }
  });
});
