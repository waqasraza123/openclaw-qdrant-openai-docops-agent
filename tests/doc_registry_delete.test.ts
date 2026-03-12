import { describe, expect, it } from "vitest";

import { deleteDocRegistryEntry } from "../src/maintenance/docRegistry.js";

describe("deleteDocRegistryEntry", () => {
  it("deletes registry point by doc id", async () => {
    const calls: any[] = [];
    const fakeClient = {
      delete: async (_collectionName: string, params: any) => {
        calls.push(params);
        return {};
      }
    };

    await deleteDocRegistryEntry({ registryCollectionName: "reg", docId: "d1", client: fakeClient });
    expect(calls.length).toBe(1);
    expect(calls[0].points).toEqual(["d1"]);
  });
});
