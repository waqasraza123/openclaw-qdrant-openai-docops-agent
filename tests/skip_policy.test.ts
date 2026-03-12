import { describe, expect, it } from "vitest";

import { evaluateSkipUnchangedIngest } from "../src/ingest/skipPolicy.js";

describe("evaluateSkipUnchangedIngest", () => {
  const baseEntry = {
    doc_id: "d1",
    source: "file.pdf",
    page_count: 1,
    chunk_count: 10,
    content_hash: "h1",
    embed_model: "m1",
    chunk_max_tokens: 450,
    chunk_overlap_tokens: 80,
    created_at: "t1",
    updated_at: "t2"
  };

  it("skips when everything matches and skip requested", () => {
    const result = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: false,
      existingEntry: baseEntry,
      contentHash: "h1",
      embedModel: "m1",
      chunkMaxTokens: 450,
      chunkOverlapTokens: 80
    });

    expect(result.should_skip).toBe(true);
    expect(result.reason).toBe("Doc unchanged; skipping re-ingest");
  });

  it("does not skip when replace requested", () => {
    const result = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: true,
      existingEntry: baseEntry,
      contentHash: "h1",
      embedModel: "m1",
      chunkMaxTokens: 450,
      chunkOverlapTokens: 80
    });

    expect(result.should_skip).toBe(false);
  });

  it("does not skip when hash differs", () => {
    const result = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: false,
      existingEntry: baseEntry,
      contentHash: "h2",
      embedModel: "m1",
      chunkMaxTokens: 450,
      chunkOverlapTokens: 80
    });

    expect(result.should_skip).toBe(false);
  });

  it("does not skip when model differs", () => {
    const result = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: false,
      existingEntry: baseEntry,
      contentHash: "h1",
      embedModel: "m2",
      chunkMaxTokens: 450,
      chunkOverlapTokens: 80
    });

    expect(result.should_skip).toBe(false);
  });

  it("does not skip when chunk params differ", () => {
    const result = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: false,
      existingEntry: baseEntry,
      contentHash: "h1",
      embedModel: "m1",
      chunkMaxTokens: 700,
      chunkOverlapTokens: 80
    });

    expect(result.should_skip).toBe(false);
  });

  it("does not skip when registry entry is missing or incomplete", () => {
    const resultMissing = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: false,
      existingEntry: null,
      contentHash: "h1",
      embedModel: "m1",
      chunkMaxTokens: 450,
      chunkOverlapTokens: 80
    });

    expect(resultMissing.should_skip).toBe(false);

    const resultZero = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: false,
      existingEntry: { ...baseEntry, chunk_count: 0 },
      contentHash: "h1",
      embedModel: "m1",
      chunkMaxTokens: 450,
      chunkOverlapTokens: 80
    });

    expect(resultZero.should_skip).toBe(false);
  });
});
