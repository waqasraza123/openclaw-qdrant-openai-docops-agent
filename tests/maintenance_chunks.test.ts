import { describe, expect, it } from "vitest";

import { getChunkForDocIdByChunkId } from "../src/maintenance/chunks.js";

describe("chunks maintenance helpers", () => {
  it("returns null when not found", async () => {
    const fakeClient = { retrieve: async (_collectionName: string, _params: unknown) => [] };
    const result = await getChunkForDocIdByChunkId(
      { docId: "d1", chunkId: "c1" },
      { collectionName: "x", client: fakeClient }
    );
    expect(result).toBeNull();
  });

  it("returns payload when found and matches doc_id and chunk_id", async () => {
    const fakeClient = {
      retrieve: async (_collectionName: string, _params: unknown) => [
        {
          payload: {
            doc_id: "d1",
            chunk_id: "c1",
            chunk_index: 2,
            token_count: 10,
            source: "file.pdf",
            text: "hello",
            created_at: "2026-03-11T00:00:00Z"
          }
        }
      ]
    };

    const result = await getChunkForDocIdByChunkId(
      { docId: "d1", chunkId: "c1" },
      { collectionName: "x", client: fakeClient }
    );
    expect(result?.doc_id).toBe("d1");
    expect(result?.chunk_id).toBe("c1");
    expect(result?.chunk_index).toBe(2);
  });

  it("returns null when doc_id does not match", async () => {
    const fakeClient = {
      retrieve: async (_collectionName: string, _params: unknown) => [
        {
          payload: {
            doc_id: "d2",
            chunk_id: "c1",
            chunk_index: 2,
            token_count: 10,
            source: "file.pdf",
            text: "hello",
            created_at: "2026-03-11T00:00:00Z"
          }
        }
      ]
    };

    const result = await getChunkForDocIdByChunkId(
      { docId: "d1", chunkId: "c1" },
      { collectionName: "x", client: fakeClient }
    );
    expect(result).toBeNull();
  });
});
