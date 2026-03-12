import fs from "node:fs/promises";
import path from "node:path";

export type CacheFileEntry = {
  absolutePath: string;
  relativePath: string;
  sizeBytes: number;
  mtimeMs: number;
};

export type CacheCleanupReport = {
  ok: boolean;
  cache_dir: string;
  dry_run: boolean;
  ttl_seconds: number;
  now_iso: string;
  scanned_files: number;
  scanned_bytes: number;
  expired_files: number;
  expired_bytes: number;
  deleted_files: number;
  deleted_bytes: number;
  kept_files: number;
  kept_bytes: number;
};

const ensureDirectoryExists = async (dirPath: string) => {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
};

const resolveWithin = (baseDir: string, absolutePath: string) => {
  const base = path.resolve(baseDir);
  const candidate = path.resolve(absolutePath);
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  return candidate === base || candidate.startsWith(prefix);
};

const listFilesRecursively = async (baseDir: string, currentDir: string): Promise<CacheFileEntry[]> => {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });
  const results: CacheFileEntry[] = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (!resolveWithin(baseDir, fullPath)) continue;

    if (entry.isDirectory()) {
      const nested = await listFilesRecursively(baseDir, fullPath);
      results.push(...nested);
      continue;
    }

    if (!entry.isFile()) continue;

    const stat = await fs.stat(fullPath);
    const relativePath = path.relative(baseDir, fullPath);

    results.push({
      absolutePath: fullPath,
      relativePath,
      sizeBytes: stat.size,
      mtimeMs: stat.mtimeMs
    });
  }

  return results;
};

const sumBytes = (entries: CacheFileEntry[]) => entries.reduce((acc, e) => acc + e.sizeBytes, 0);

const selectExpired = (entries: CacheFileEntry[], nowMs: number, ttlSeconds: number) => {
  const expiresBeforeMs = nowMs - ttlSeconds * 1000;
  return entries.filter((e) => e.mtimeMs < expiresBeforeMs);
};

const applyLimits = (entries: CacheFileEntry[], maxDeleteCount: number | null, maxDeleteBytes: number | null) => {
  const ordered = [...entries].sort((a, b) => a.mtimeMs - b.mtimeMs);
  const selected: CacheFileEntry[] = [];
  let bytes = 0;

  for (const entry of ordered) {
    if (maxDeleteCount !== null && selected.length >= maxDeleteCount) break;
    if (maxDeleteBytes !== null && bytes + entry.sizeBytes > maxDeleteBytes) break;
    selected.push(entry);
    bytes += entry.sizeBytes;
  }

  return selected;
};

export const cleanupCacheDirectory = async (params: {
  cacheDir: string;
  ttlSeconds: number;
  nowMs: number;
  dryRun: boolean;
  maxDeleteCount: number | null;
  maxDeleteBytes: number | null;
}): Promise<CacheCleanupReport> => {
  if (params.ttlSeconds <= 0) throw new Error("ttlSeconds must be > 0");
  if (params.maxDeleteCount !== null && params.maxDeleteCount <= 0) throw new Error("maxDeleteCount must be > 0");
  if (params.maxDeleteBytes !== null && params.maxDeleteBytes <= 0) throw new Error("maxDeleteBytes must be > 0");

  const cacheDirResolved = path.resolve(params.cacheDir);
  const nowIso = new Date(params.nowMs).toISOString();

  const exists = await ensureDirectoryExists(cacheDirResolved);
  if (!exists) {
    return {
      ok: true,
      cache_dir: cacheDirResolved,
      dry_run: params.dryRun,
      ttl_seconds: params.ttlSeconds,
      now_iso: nowIso,
      scanned_files: 0,
      scanned_bytes: 0,
      expired_files: 0,
      expired_bytes: 0,
      deleted_files: 0,
      deleted_bytes: 0,
      kept_files: 0,
      kept_bytes: 0
    };
  }

  const entries = await listFilesRecursively(cacheDirResolved, cacheDirResolved);
  const scannedBytes = sumBytes(entries);

  const expired = selectExpired(entries, params.nowMs, params.ttlSeconds);
  const expiredBytes = sumBytes(expired);

  const deletions = applyLimits(expired, params.maxDeleteCount, params.maxDeleteBytes);
  const deletedBytes = sumBytes(deletions);

  if (!params.dryRun) {
    for (const entry of deletions) {
      if (!resolveWithin(cacheDirResolved, entry.absolutePath)) continue;
      await fs.unlink(entry.absolutePath);
    }
  }

  const deletedFiles = deletions.length;
  const expiredFiles = expired.length;
  const keptFiles = entries.length - deletedFiles;
  const keptBytes = scannedBytes - deletedBytes;

  return {
    ok: true,
    cache_dir: cacheDirResolved,
    dry_run: params.dryRun,
    ttl_seconds: params.ttlSeconds,
    now_iso: nowIso,
    scanned_files: entries.length,
    scanned_bytes: scannedBytes,
    expired_files: expiredFiles,
    expired_bytes: expiredBytes,
    deleted_files: deletedFiles,
    deleted_bytes: deletedBytes,
    kept_files: keptFiles,
    kept_bytes: keptBytes
  };
};
