import { describe, expect, it } from "vitest";

import { countChunksForDocId, deleteChunksForDocId } from "../src/maintenance/documents.js";

describe("documents maintenance helpers", () => {
  it("counts chunks for doc id", async () => {
    const fakeClient = {
      count: async (_collectionName: string, _params: unknown) => ({ count: 12 }),
      delete: async (_collectionName: string, _params: unknown) => ({})
    };

    const count = await countChunksForDocId("sample", { collectionName: "x", client: fakeClient });
    expect(count).toBe(12);
  });

  it("throws on unexpected count response shape", async () => {
    const fakeClient = {
      count: async (_collectionName: string, _params: unknown) => ({ count: "nope" }),
      delete: async (_collectionName: string, _params: unknown) => ({})
    };

    await expect(countChunksForDocId("sample", { collectionName: "x", client: fakeClient })).rejects.toThrow(
      "Unexpected Qdrant count response"
    );
  });

  it("deletes chunks for doc id", async () => {
    let deleteCalled = false;

    const fakeClient = {
      count: async (_collectionName: string, _params: unknown) => ({ count: 0 }),
      delete: async (_collectionName: string, _params: unknown) => {
        deleteCalled = true;
        return {};
      }
    };

    await deleteChunksForDocId("sample", { collectionName: "x", client: fakeClient });
    expect(deleteCalled).toBe(true);
  });
});
