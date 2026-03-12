import { describe, expect, it } from "vitest";

import { listDocIdsInCollection } from "../src/maintenance/docList.js";

describe("listDocIdsInCollection", () => {
  it("deduplicates doc_ids across pages and returns sorted list", async () => {
    const calls: unknown[] = [];

    const fakeClient = {
      scroll: async (_collectionName: string, params: unknown) => {
        calls.push(params);
        const p = params as Record<string, unknown>;
        const offset = p["offset"];

        if (!offset) {
          return {
            points: [{ payload: { doc_id: "b" } }, { payload: { doc_id: "a" } }],
            next_page_offset: "p2"
          };
        }

        return {
          points: [{ payload: { doc_id: "a" } }, { payload: { doc_id: "c" } }],
          next_page_offset: null
        };
      }
    };

    const result = await listDocIdsInCollection({
      collectionName: "x",
      maxPointsToScan: 100,
      pageSize: 2,
      client: fakeClient
    });

    expect(result.docIds).toEqual(["a", "b", "c"]);
    expect(result.scannedPoints).toBe(4);
    expect(calls.length).toBe(2);
  });

  it("respects maxPointsToScan by limiting processed points", async () => {
    const fakeClient = {
      scroll: async (_collectionName: string, _params: unknown) => ({
        points: [{ payload: { doc_id: "a" } }, { payload: { doc_id: "b" } }, { payload: { doc_id: "c" } }],
        next_page_offset: "p2"
      })
    };

    const result = await listDocIdsInCollection({
      collectionName: "x",
      maxPointsToScan: 2,
      pageSize: 10,
      client: fakeClient
    });

    expect(result.scannedPoints).toBe(2);
    expect(result.docIds).toEqual(["a", "b"]);
  });
});
