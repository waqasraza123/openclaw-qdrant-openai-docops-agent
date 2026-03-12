import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { listDocRegistryEntries } from "../src/maintenance/docRegistry.js";
import { buildRegistryExportPayload, persistRegistryExportPayload, resolveDefaultRegistryExportPath } from "../src/maintenance/registryExport.js";
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

const run = async () => {
  const args = process.argv.slice(2);

  const outArg = getArgValue(args, "--out");
  const maxDocsArg = getArgValue(args, "--max-docs");
  const pageSizeArg = getArgValue(args, "--page-size");

  const maxDocs = maxDocsArg ? parsePositiveInt(maxDocsArg, "max-docs") : 1000;
  const pageSize = pageSizeArg ? parsePositiveInt(pageSizeArg, "page-size") : appConfig.QDRANT_BATCH_SIZE;

  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  const createdAtIso = new Date().toISOString();

  const result = await listDocRegistryEntries({ registryCollectionName, maxDocs, pageSize });
  const payload = buildRegistryExportPayload({
    createdAtIso,
    registryCollectionName,
    scannedPoints: result.scannedPoints,
    entries: result.entries
  });

  const outPath = outArg ? outArg : resolveDefaultRegistryExportPath({ baseDir: "tmp", createdAtIso });
  const resolved = await persistRegistryExportPayload({ payload, outPath });

  process.stdout.write(
    JSON.stringify(
      { ok: true, out_path: resolved, registry_collection: registryCollectionName, entry_count: payload.entry_count },
      null,
      2
    ) + "\n"
  );
};

run().catch((error) => {
  logger.error({ err: error }, "Registry export failed");
  process.exitCode = 1;
});
