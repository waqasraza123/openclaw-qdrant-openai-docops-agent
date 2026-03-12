import { describe, expect, it } from "vitest";

import { exportChunksForDocId } from "../src/maintenance/docExport.js";

describe("exportChunksForDocId", () => {
  it("exports and sorts chunks by chunk_index then chunk_id", async () => {
    const fakeClient = {
      scroll: async (_collectionName: string, params: unknown) => {
        const p = params as Record<string, unknown>;
        const offset = p["offset"];
        if (!offset) {
          return {
            points: [
              { payload: { doc_id: "d1", chunk_id: "c2", chunk_index: 2, token_count: 10, source: "s", text: "t", created_at: "x" } },
              { payload: { doc_id: "d1", chunk_id: "c1", chunk_index: 1, token_count: 10, source: "s", text: "t", created_at: "x" } }
            ],
            next_page_offset: "p2"
          };
        }
        return {
          points: [
            { payload: { doc_id: "d1", chunk_id: "c3", chunk_index: 2, token_count: 10, source: "s", text: "t", created_at: "x" } }
          ],
          next_page_offset: null
        };
      }
    };

    const result = await exportChunksForDocId({ collectionName: "x", docId: "d1", maxChunks: 10, pageSize: 2, client: fakeClient });

    expect(result.chunks.map((c) => c.chunk_id)).toEqual(["c1", "c2", "c3"]);
    expect(result.scannedPoints).toBe(3);
  });

  it("respects maxChunks and deduplicates by chunk_id", async () => {
    const fakeClient = {
      scroll: async (_collectionName: string, _params: unknown) => ({
        points: [
          { payload: { doc_id: "d1", chunk_id: "c1", chunk_index: 1, token_count: 10, source: "s", text: "t", created_at: "x" } },
          { payload: { doc_id: "d1", chunk_id: "c1", chunk_index: 1, token_count: 10, source: "s", text: "t", created_at: "x" } },
          { payload: { doc_id: "d1", chunk_id: "c2", chunk_index: 2, token_count: 10, source: "s", text: "t", created_at: "x" } }
        ],
        next_page_offset: null
      })
    };

    const result = await exportChunksForDocId({ collectionName: "x", docId: "d1", maxChunks: 1, pageSize: 10, client: fakeClient });

    expect(result.chunks.map((c) => c.chunk_id)).toEqual(["c1"]);
    expect(result.chunks.length).toBe(1);
  });
});
