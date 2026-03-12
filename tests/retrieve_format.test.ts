import { describe, expect, it } from "vitest";

import { formatRetrievedSources } from "../src/retrieve/format.js";

describe("formatRetrievedSources", () => {
  const sources = [
    {
      sourceId: "S1",
      chunkId: "c1",
      score: 0.9,
      text: "t",
      source: "f",
      chunkIndex: 1
    }
  ];

  it("omits text when includeText is false", () => {
    const formatted = formatRetrievedSources({ sources: sources as any, includeText: false });
    expect(formatted.length).toBe(1);
    const first = formatted[0]!;
    expect(first.source_id).toBe("S1");
    expect("text" in first).toBe(false);
  });

  it("includes text when includeText is true", () => {
    const formatted = formatRetrievedSources({ sources: sources as any, includeText: true });
    expect(formatted.length).toBe(1);
    const first = formatted[0]!;
    expect(first.text).toBe("t");
  });
});
