import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import {
  ensureDocRegistryCollection,
  getDocRegistryEntry,
  upsertDocRegistryEntry
} from "../src/maintenance/docRegistry.js";
import {
  loadRegistryExportPayloadFromFile,
  importRegistryExportPayload
} from "../src/maintenance/registryImport.js";
import { getDocRegistryCollectionName } from "../src/maintenance/registryNaming.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const parsePositiveInt = (value: string, fieldName: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(fieldName + " must be a positive integer");
  return parsed;
};

const parseBoolean = (value: string | null, fieldName: string) => {
  if (value === null) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(fieldName + " must be true or false");
};

const run = async () => {
  const args = process.argv.slice(2);

  const inPath = getArgValue(args, "--in");
  const dryRun = parseBoolean(getArgValue(args, "--dry-run"), "dry-run");
  const skipExisting = parseBoolean(getArgValue(args, "--skip-existing"), "skip-existing");
  const maxEntriesArg = getArgValue(args, "--max-entries");

  if (!inPath) {
    throw new Error(
      "Usage: npm run registry:import -- --in <path> [--dry-run true] [--skip-existing true] [--max-entries N]"
    );
  }

  const maxEntries = maxEntriesArg ? parsePositiveInt(maxEntriesArg, "max-entries") : 50000;

  const payload = await loadRegistryExportPayloadFromFile(inPath);
  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);

  const result = await importRegistryExportPayload({
    inPath,
    registryCollectionName,
    payload,
    dependencies: {
      ensureRegistryCollection: async () => await ensureDocRegistryCollection({ registryCollectionName }),
      upsertEntry: async (entry) => await upsertDocRegistryEntry({ registryCollectionName, entry }),
      getExistingEntry: async (docId) => await getDocRegistryEntry({ registryCollectionName, docId })
    },
    skipExisting,
    dryRun,
    maxEntries
  });

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exitCode = 1;
};

run().catch((error) => {
  logger.error({ err: error }, "Registry import failed");
  process.exitCode = 1;
});
