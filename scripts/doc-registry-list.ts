import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { listDocRegistryEntries } from "../src/maintenance/docRegistry.js";
import { getDocRegistryCollectionName } from "../src/maintenance/registryNaming.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const parsePositiveInt = (value: string, fieldName: string) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(fieldName + " must be a positive integer");
  return parsed;
};

const run = async () => {
  const args = process.argv.slice(2);
  const maxDocsArg = getArgValue(args, "--max-docs");
  const pageSizeArg = getArgValue(args, "--page-size");

  const maxDocs = maxDocsArg ? parsePositiveInt(maxDocsArg, "max-docs") : 1000;
  const pageSize = pageSizeArg ? parsePositiveInt(pageSizeArg, "page-size") : appConfig.QDRANT_BATCH_SIZE;

  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);

  const result = await listDocRegistryEntries({
    registryCollectionName,
    maxDocs,
    pageSize
  });

  process.stdout.write(
    JSON.stringify(
      { registry_collection: registryCollectionName, entries: result.entries, scanned_points: result.scannedPoints },
      null,
      2
    ) + "\n"
  );
};

run().catch((error) => {
  logger.error({ err: error }, "Doc registry list failed");
  process.exitCode = 1;
});
