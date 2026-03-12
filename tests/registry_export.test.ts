import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildRegistryExportPayload, persistRegistryExportPayload, resolveDefaultRegistryExportPath } from "../src/maintenance/registryExport.js";

describe("registry export", () => {
  it("builds payload with sorted entries and counts", () => {
    const payload = buildRegistryExportPayload({
      createdAtIso: "t",
      registryCollectionName: "reg",
      scannedPoints: 10,
      entries: [
        {
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
        },
        {
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
      ]
    });

    expect(payload.entry_count).toBe(2);
    expect(payload.entries.map((e) => e.doc_id)).toEqual(["a", "b"]);
  });

  it("persists payload to disk", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "docops-registry-export-"));
    const outPath = path.join(tmpDir, "export.json");
    const payload = buildRegistryExportPayload({
      createdAtIso: "t",
      registryCollectionName: "reg",
      scannedPoints: 0,
      entries: []
    });

    const savedPath = await persistRegistryExportPayload({ payload, outPath });
    const saved = JSON.parse(await fs.readFile(savedPath, "utf8"));
    expect(saved.registry_collection).toBe("reg");
    expect(saved.entry_count).toBe(0);
  });

  it("builds default export path under tmp/registry", () => {
    const p = resolveDefaultRegistryExportPath({ baseDir: "tmp", createdAtIso: "2026-03-12T00:00:00.000Z" });
    expect(p.includes("tmp")).toBe(true);
    expect(p.includes("registry")).toBe(true);
    expect(p.endsWith(".json")).toBe(true);
  });
});
