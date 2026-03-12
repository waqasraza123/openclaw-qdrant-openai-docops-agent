import fs from "node:fs/promises";
import path from "node:path";

import type { DocRegistryEntry } from "./docRegistry.js";

export type RegistryExportPayload = {
  created_at: string;
  registry_collection: string;
  scanned_points: number;
  entry_count: number;
  entries: DocRegistryEntry[];
};

export const sanitizeFilePart = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 160);

export const buildRegistryExportPayload = (params: {
  createdAtIso: string;
  registryCollectionName: string;
  scannedPoints: number;
  entries: DocRegistryEntry[];
}): RegistryExportPayload => {
  return {
    created_at: params.createdAtIso,
    registry_collection: params.registryCollectionName,
    scanned_points: params.scannedPoints,
    entry_count: params.entries.length,
    entries: [...params.entries].sort((a, b) => a.doc_id.localeCompare(b.doc_id))
  };
};

export const resolveDefaultRegistryExportPath = (params: { baseDir: string; createdAtIso: string }) => {
  const safeTimestamp = sanitizeFilePart(params.createdAtIso);
  return path.join(params.baseDir, "registry", "registry-export-" + safeTimestamp + ".json");
};

export const persistRegistryExportPayload = async (params: {
  payload: RegistryExportPayload;
  outPath: string;
}): Promise<string> => {
  const resolved = path.resolve(params.outPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(params.payload, null, 2), "utf8");
  return resolved;
};
