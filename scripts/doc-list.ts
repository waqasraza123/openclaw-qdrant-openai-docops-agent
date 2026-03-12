import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { listDocIdsInCollection } from "../src/maintenance/docList.js";

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

  const maxScanArg = getArgValue(args, "--max-scan");
  const pageSizeArg = getArgValue(args, "--page-size");

  const maxPointsToScan = maxScanArg ? parsePositiveInt(maxScanArg, "max-scan") : appConfig.MAX_CHUNKS_PER_DOC;
  const pageSize = pageSizeArg ? parsePositiveInt(pageSizeArg, "page-size") : appConfig.QDRANT_BATCH_SIZE;

  const result = await listDocIdsInCollection({
    collectionName: appConfig.QDRANT_COLLECTION,
    maxPointsToScan,
    pageSize
  });

  process.stdout.write(JSON.stringify({ doc_ids: result.docIds, scanned_points: result.scannedPoints }, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Doc list failed");
  process.exitCode = 1;
});
