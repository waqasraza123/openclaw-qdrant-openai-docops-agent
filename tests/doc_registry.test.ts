import { describe, expect, it } from "vitest";

import {
  ensureDocRegistryCollection,
  getDocRegistryEntry,
  listDocRegistryEntries,
  upsertDocRegistryEntry
} from "../src/maintenance/docRegistry.js";

describe("doc registry", () => {
  it("creates registry collection when missing", async () => {
    let created = false;

    const fakeClient = {
      getCollections: async () => ({ collections: [] }),
      createCollection: async () => {
        created = true;
        return {};
      },
      getCollection: async () => ({}),
      upsert: async () => ({}),
      retrieve: async () => [],
      scroll: async () => ({ points: [], next_page_offset: null })
    };

    await ensureDocRegistryCollection({ registryCollectionName: "reg", client: fakeClient });
    expect(created).toBe(true);
  });

  it("upserts and retrieves registry entry", async () => {
    let storedPayload: any = null;

    const entry = {
      doc_id: "d1",
      source: "file.pdf",
      page_count: 2,
      chunk_count: 10,
      content_hash: "h",
      embed_model: "m",
      chunk_max_tokens: 450,
      chunk_overlap_tokens: 80,
      created_at: "t1",
      updated_at: "t2"
    };

    const fakeClient = {
      getCollections: async () => ({ collections: [{ name: "reg" }] }),
      createCollection: async () => ({}),
      getCollection: async () => ({ config: { params: { vectors: { size: 1 } } } }),
      upsert: async (_collectionName: string, params: any) => {
        storedPayload = params.points[0].payload;
        return {};
      },
      retrieve: async () => [{ payload: storedPayload }],
      scroll: async () => ({ points: [], next_page_offset: null })
    };

    await upsertDocRegistryEntry({ registryCollectionName: "reg", entry, client: fakeClient });
    const loaded = await getDocRegistryEntry({
      registryCollectionName: "reg",
      docId: "d1",
      client: fakeClient
    });

    expect(loaded?.doc_id).toBe("d1");
    expect(loaded?.chunk_count).toBe(10);
  });

  it("lists registry entries and sorts by doc_id", async () => {
    const fakeClient = {
      getCollections: async () => ({ collections: [{ name: "reg" }] }),
      createCollection: async () => ({}),
      getCollection: async () => ({ config: { params: { vectors: { size: 1 } } } }),
      upsert: async () => ({}),
      retrieve: async () => [],
      scroll: async (_collectionName: string, params: any) => {
        if (!params.offset) {
          return {
            points: [
              {
                payload: {
                  doc_id: "b",
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
              },
              {
                payload: {
                  doc_id: "a",
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
              }
            ],
            next_page_offset: "p2"
          };
        }
        return {
          points: [
            {
              payload: {
                doc_id: "c",
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
            }
          ],
          next_page_offset: null
        };
      }
    };

    const result = await listDocRegistryEntries({
      registryCollectionName: "reg",
      maxDocs: 100,
      pageSize: 2,
      client: fakeClient
    });
    expect(result.entries.map((e) => e.doc_id)).toEqual(["a", "b", "c"]);
    expect(result.scannedPoints).toBe(3);
  });
});
