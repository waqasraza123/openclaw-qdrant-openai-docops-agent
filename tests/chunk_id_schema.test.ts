import { describe, expect, it } from "vitest";

import { ChunkIdSchema } from "../src/web/schemas.js";

describe("ChunkIdSchema", () => {
  it("accepts lowercase sha256 hex", () => {
    const valid = ""aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    expect(ChunkIdSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects non-hex or wrong length", () => {
    const invalid = ["", "a", ""AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", ""gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg", ""aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", ""aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "deadbeef", ""aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" + "z"];
    for (const value of invalid) {
      expect(ChunkIdSchema.safeParse(value).success).toBe(false);
    }
  });
});
