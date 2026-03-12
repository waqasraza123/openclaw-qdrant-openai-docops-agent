import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { cleanupCacheDirectory } from "../src/maintenance/cacheCleanup.js";

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

const parseOptionalPositiveInt = (value: string | null, fieldName: string) => {
  if (!value) return null;
  return parsePositiveInt(value, fieldName);
};

const parseBoolean = (value: string | null, fieldName: string) => {
  if (value === null) return false;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(fieldName + " must be true or false");
};

const run = async () => {
  const args = process.argv.slice(2);

  const dryRun = parseBoolean(getArgValue(args, "--dry-run"), "dry-run");
  const ttlSeconds =
    parseOptionalPositiveInt(getArgValue(args, "--ttl-seconds"), "ttl-seconds") ??
    appConfig.CACHE_TTL_SECONDS;
  const maxDeleteCount = parseOptionalPositiveInt(
    getArgValue(args, "--max-delete-count"),
    "max-delete-count"
  );
  const maxDeleteMb = parseOptionalPositiveInt(getArgValue(args, "--max-delete-mb"), "max-delete-mb");

  const maxDeleteBytes = maxDeleteMb === null ? null : maxDeleteMb * 1024 * 1024;

  const report = await cleanupCacheDirectory({
    cacheDir: appConfig.CACHE_DIR,
    ttlSeconds,
    nowMs: Date.now(),
    dryRun,
    maxDeleteCount,
    maxDeleteBytes
  });

  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  if (!report.ok) process.exitCode = 1;
};

run().catch((error) => {
  logger.error({ err: error }, "Cache cleanup failed");
  process.exitCode = 1;
});
