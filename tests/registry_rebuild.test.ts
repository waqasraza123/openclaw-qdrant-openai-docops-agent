import { describe, expect, it } from "vitest";

import { rebuildDocRegistry } from "../src/maintenance/registryRebuild.js";

describe("rebuildDocRegistry", () => {
  it("upserts registry entries derived from ordered chunk ids", async () => {
    const upserts: any[] = [];

    const report = await rebuildDocRegistry(
      {
        sourceCollectionName: "docs_chunks",
        registryCollectionName: "docs_chunks_registry",
        embedModel: "text-embedding-3-small",
        chunkMaxTokens: 450,
        chunkOverlapTokens: 80,
        nowIso: () => "t",
        sha256Hex: (input: string) => "h:" + input,
        ensureRegistryCollection: async () => undefined,
        listDocIds: async () => ({ docIds: ["d1"], scannedPoints: 2 }),
        exportChunks: async () => ({
          scannedPoints: 3,
          chunks: [
            {
              doc_id: "d1",
              chunk_id: "c2",
              chunk_index: 2,
              token_count: 1,
              source: "a.pdf",
              text: "x",
              created_at: "t"
            },
            {
              doc_id: "d1",
              chunk_id: "c1",
              chunk_index: 1,
              token_count: 1,
              source: "a.pdf",
              text: "y",
              created_at: "t"
            }
          ]
        }),
        upsertRegistryEntry: async (entry) => {
        upserts.push(entry);
      }},
      {
        maxScanPoints: 10,
        listPageSize: 2,
        maxDocs: 10,
        maxChunksPerDoc: 10,
        chunksPageSize: 2,
        dryRun: false
      }
    );

    expect(report.ok).toBe(true);
    expect(upserts.length).toBe(1);
    expect(upserts[0].doc_id).toBe("d1");
    expect(upserts[0].chunk_count).toBe(2);
    expect(upserts[0].content_hash).toBe("h:c1\nc2");
  });

  it("skips doc ids with no chunks", async () => {
    const report = await rebuildDocRegistry(
      {
        sourceCollectionName: "docs_chunks",
        registryCollectionName: "docs_chunks_registry",
        embedModel: "m",
        chunkMaxTokens: 1,
        chunkOverlapTokens: 0,
        nowIso: () => "t",
        sha256Hex: (input: string) => "h:" + input,
        ensureRegistryCollection: async () => undefined,
        listDocIds: async () => ({ docIds: ["d1"], scannedPoints: 1 }),
        exportChunks: async () => ({ scannedPoints: 0, chunks: [] }),
        upsertRegistryEntry: async () => undefined
      },
      {
        maxScanPoints: 10,
        listPageSize: 2,
        maxDocs: 10,
        maxChunksPerDoc: 10,
        chunksPageSize: 2,
        dryRun: false
      }
    );

    expect(report.docs_updated).toBe(0);
    expect(report.docs_skipped).toBe(1);
    expect(report.results.length).toBe(1);
    expect(report.results[0]!.skipped_reason).toBe("No chunks found for doc_id");
  });

  it("supports dry run without upserts", async () => {
    let upsertCalled = false;

    const report = await rebuildDocRegistry(
      {
        sourceCollectionName: "docs_chunks",
        registryCollectionName: "docs_chunks_registry",
        embedModel: "m",
        chunkMaxTokens: 1,
        chunkOverlapTokens: 0,
        nowIso: () => "t",
        sha256Hex: (input: string) => "h:" + input,
        ensureRegistryCollection: async () => undefined,
        listDocIds: async () => ({ docIds: ["d1"], scannedPoints: 1 }),
        exportChunks: async () => ({
          scannedPoints: 1,
          chunks: [
            {
              doc_id: "d1",
              chunk_id: "c1",
              chunk_index: 1,
              token_count: 1,
              source: "a.pdf",
              text: "x",
              created_at: "t"
            }
          ]
        }),
        upsertRegistryEntry: async () => {
          upsertCalled = true;
        }
      },
      {
        maxScanPoints: 10,
        listPageSize: 2,
        maxDocs: 10,
        maxChunksPerDoc: 10,
        chunksPageSize: 2,
        dryRun: true
      }
    );

    expect(report.docs_updated).toBe(1);
    expect(upsertCalled).toBe(false);
  });
});
