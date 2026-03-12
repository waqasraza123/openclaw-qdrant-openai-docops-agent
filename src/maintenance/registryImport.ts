import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

export const DocRegistryEntrySchema = z.object({
  doc_id: z.string().min(1),
  source: z.string().min(1),
  page_count: z.number().int().nonnegative().nullable(),
  chunk_count: z.number().int().nonnegative(),
  content_hash: z.string().min(1),
  embed_model: z.string().min(1),
  chunk_max_tokens: z.number().int().positive(),
  chunk_overlap_tokens: z.number().int().nonnegative(),
  created_at: z.string().min(1),
  updated_at: z.string().min(1)
});

export type DocRegistryEntry = z.infer<typeof DocRegistryEntrySchema>;

export const RegistryExportPayloadSchema = z.object({
  created_at: z.string().min(1),
  registry_collection: z.string().min(1),
  scanned_points: z.number().int().nonnegative(),
  entry_count: z.number().int().nonnegative(),
  entries: z.array(DocRegistryEntrySchema)
});

export type RegistryExportPayload = z.infer<typeof RegistryExportPayloadSchema>;

export type RegistryImportResult = {
  ok: boolean;
  in_path: string;
  registry_collection: string;
  source_registry_collection: string;
  source_created_at: string;
  requested_max_entries: number;
  entries_seen: number;
  imported: number;
  skipped_existing: number;
  failed: number;
  failures: Array<{ doc_id: string; error: string }>;
};

export type RegistryImportDependencies = {
  ensureRegistryCollection: () => Promise<void>;
  upsertEntry: (entry: DocRegistryEntry) => Promise<void>;
  getExistingEntry: (docId: string) => Promise<DocRegistryEntry | null>;
};

const stringifyError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const parseRegistryExportPayload = (value: unknown): RegistryExportPayload => {
  const parsed = RegistryExportPayloadSchema.parse(value);
  if (parsed.entry_count !== parsed.entries.length) {
    return { ...parsed, entry_count: parsed.entries.length };
  }
  return parsed;
};

export const loadRegistryExportPayloadFromFile = async (filePath: string): Promise<RegistryExportPayload> => {
  const resolved = path.resolve(filePath);
  const raw = await fs.readFile(resolved, "utf8");
  const jsonValue = JSON.parse(raw) as unknown;
  return parseRegistryExportPayload(jsonValue);
};

export const importRegistryExportPayload = async (params: {
  inPath: string;
  registryCollectionName: string;
  payload: RegistryExportPayload;
  dependencies: RegistryImportDependencies;
  skipExisting: boolean;
  dryRun: boolean;
  maxEntries: number;
}): Promise<RegistryImportResult> => {
  if (params.maxEntries <= 0) throw new Error("maxEntries must be > 0");

  await params.dependencies.ensureRegistryCollection();

  const entries = params.payload.entries.slice(0, params.maxEntries);

  let imported = 0;
  let skippedExisting = 0;
  let failed = 0;
  const failures: Array<{ doc_id: string; error: string }> = [];

  for (const entry of entries) {
    try {
      if (params.skipExisting) {
        const existing = await params.dependencies.getExistingEntry(entry.doc_id);
        if (existing) {
          skippedExisting += 1;
          continue;
        }
      }

      if (!params.dryRun) {
        await params.dependencies.upsertEntry(entry);
      }

      imported += 1;
    } catch (error) {
      failed += 1;
      failures.push({ doc_id: entry.doc_id, error: stringifyError(error) });
    }
  }

  return {
    ok: failed === 0,
    in_path: path.resolve(params.inPath),
    registry_collection: params.registryCollectionName,
    source_registry_collection: params.payload.registry_collection,
    source_created_at: params.payload.created_at,
    requested_max_entries: params.maxEntries,
    entries_seen: entries.length,
    imported,
    skipped_existing: skippedExisting,
    failed,
    failures
  };
};
