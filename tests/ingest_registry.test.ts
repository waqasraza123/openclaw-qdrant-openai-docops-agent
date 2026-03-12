import { describe, expect, it } from "vitest";

import { buildDocRegistryEntry, computeDocumentContentHash, resolveRegistryTimestamps } from "../src/ingest/registry.js";

describe("ingest registry helpers", () => {
  it("computes deterministic content hash via injected sha256", () => {
    const sha256Hex = (input: string) => "hash:" + input.length.toString();
    expect(computeDocumentContentHash("abc", sha256Hex)).toBe("hash:3");
    expect(computeDocumentContentHash("abcd", sha256Hex)).toBe("hash:4");
  });

  it("resolves timestamps preserving created_at when present", () => {
    const nowIso = "2026-03-12T00:00:00.000Z";
    const existingCreatedAtIso = "2026-03-01T00:00:00.000Z";
    const resolved = resolveRegistryTimestamps({ existingCreatedAtIso, nowIso });
    expect(resolved.createdAtIso).toBe(existingCreatedAtIso);
    expect(resolved.updatedAtIso).toBe(nowIso);
  });

  it("uses nowIso as created_at when none exists", () => {
    const nowIso = "2026-03-12T00:00:00.000Z";
    const resolved = resolveRegistryTimestamps({ existingCreatedAtIso: null, nowIso });
    expect(resolved.createdAtIso).toBe(nowIso);
    expect(resolved.updatedAtIso).toBe(nowIso);
  });

  it("builds registry entry with required fields", () => {
    const entry = buildDocRegistryEntry({
      docId: "sample",
      sourcePath: "/tmp/file.pdf",
      pageCount: 2,
      chunkCount: 10,
      contentHash: "h",
      embedModel: "text-embedding-3-small",
      chunkMaxTokens: 450,
      chunkOverlapTokens: 80,
      createdAtIso: "t1",
      updatedAtIso: "t2"
    });

    expect(entry.doc_id).toBe("sample");
    expect(entry.source).toBe("file.pdf");
    expect(entry.page_count).toBe(2);
    expect(entry.chunk_count).toBe(10);
    expect(entry.content_hash).toBe("h");
    expect(entry.embed_model).toBe("text-embedding-3-small");
    expect(entry.chunk_max_tokens).toBe(450);
    expect(entry.chunk_overlap_tokens).toBe(80);
    expect(entry.created_at).toBe("t1");
    expect(entry.updated_at).toBe("t2");
  });
});
