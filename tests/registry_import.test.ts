import { describe, expect, it } from "vitest";

import {
  importRegistryExportPayload,
  parseRegistryExportPayload
} from "../src/maintenance/registryImport.js";

describe("registry import", () => {
  it("parses payload and normalizes entry_count", () => {
    const payload = parseRegistryExportPayload({
      created_at: "t",
      registry_collection: "reg",
      scanned_points: 0,
      entry_count: 999,
      entries: [
        {
          doc_id: "d1",
          source: "s",
          page_count: null,
          chunk_count: 1,
          content_hash: "h",
          embed_model: "m",
          chunk_max_tokens: 1,
          chunk_overlap_tokens: 0,
          created_at: "t",
          updated_at: "t"
        }
      ]
    });

    expect(payload.entry_count).toBe(1);
  });

  it("imports entries and supports skip-existing and dry-run", async () => {
    const upserts: string[] = [];

    const payload = parseRegistryExportPayload({
      created_at: "t",
      registry_collection: "reg",
      scanned_points: 0,
      entry_count: 2,
      entries: [
        {
          doc_id: "d1",
          source: "s",
          page_count: null,
          chunk_count: 1,
          content_hash: "h",
          embed_model: "m",
          chunk_max_tokens: 1,
          chunk_overlap_tokens: 0,
          created_at: "t",
          updated_at: "t"
        },
        {
          doc_id: "d2",
          source: "s",
          page_count: null,
          chunk_count: 1,
          content_hash: "h",
          embed_model: "m",
          chunk_max_tokens: 1,
          chunk_overlap_tokens: 0,
          created_at: "t",
          updated_at: "t"
        }
      ]
    });

    const resultDry = await importRegistryExportPayload({
      inPath: "in.json",
      registryCollectionName: "reg",
      payload,
      dependencies: {
        ensureRegistryCollection: async () => undefined,
        upsertEntry: async (entry) => {
        upserts.push(entry.doc_id);
      },
        getExistingEntry: async () => null
      },
      skipExisting: false,
      dryRun: true,
      maxEntries: 10
    });

    expect(resultDry.imported).toBe(2);
    expect(upserts.length).toBe(0);

    const resultSkip = await importRegistryExportPayload({
      inPath: "in.json",
      registryCollectionName: "reg",
      payload,
      dependencies: {
        ensureRegistryCollection: async () => undefined,
        upsertEntry: async (entry) => {
        upserts.push(entry.doc_id);
      },
        getExistingEntry: async (docId) => {
        const existing = payload.entries.length > 0 ? payload.entries[0] : null;
        return docId === "d1" && existing ? existing : null;
      }
      },
      skipExisting: true,
      dryRun: false,
      maxEntries: 10
    });

    expect(resultSkip.imported).toBe(1);
    expect(resultSkip.skipped_existing).toBe(1);
    expect(upserts).toEqual(["d2"]);
  });
});
