import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { cleanupCacheDirectory } from "../src/maintenance/cacheCleanup.js";

const writeFileWithMtime = async (filePath: string, content: string, mtimeMs: number) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  const time = new Date(mtimeMs);
  await fs.utimes(filePath, time, time);
};

describe("cleanupCacheDirectory", () => {
  it("dry run reports deletions without deleting", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "docops-cache-"));
    const nowMs = Date.now();

    const oldPath = path.join(baseDir, "old.txt");
    const newPath = path.join(baseDir, "new.txt");

    await writeFileWithMtime(oldPath, "x", nowMs - 10_000);
    await writeFileWithMtime(newPath, "y", nowMs);

    const report = await cleanupCacheDirectory({
      cacheDir: baseDir,
      ttlSeconds: 5,
      nowMs,
      dryRun: true,
      maxDeleteCount: null,
      maxDeleteBytes: null
    });

    expect(report.scanned_files).toBe(2);
    expect(report.expired_files).toBe(1);
    expect(report.deleted_files).toBe(1);

    const oldExists = await fs
      .stat(oldPath)
      .then(() => true)
      .catch(() => false);
    expect(oldExists).toBe(true);
  });

  it("deletes expired entries when not dry run", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "docops-cache-"));
    const nowMs = Date.now();

    const oldPath = path.join(baseDir, "nested", "old.txt");
    const newPath = path.join(baseDir, "nested", "new.txt");

    await writeFileWithMtime(oldPath, "x", nowMs - 10_000);
    await writeFileWithMtime(newPath, "y", nowMs);

    const report = await cleanupCacheDirectory({
      cacheDir: baseDir,
      ttlSeconds: 5,
      nowMs,
      dryRun: false,
      maxDeleteCount: null,
      maxDeleteBytes: null
    });

    expect(report.expired_files).toBe(1);
    expect(report.deleted_files).toBe(1);

    const oldExists = await fs
      .stat(oldPath)
      .then(() => true)
      .catch(() => false);
    const newExists = await fs
      .stat(newPath)
      .then(() => true)
      .catch(() => false);

    expect(oldExists).toBe(false);
    expect(newExists).toBe(true);
  });

  it("respects maxDeleteCount limit", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "docops-cache-"));
    const nowMs = Date.now();

    await writeFileWithMtime(path.join(baseDir, "a.txt"), "a", nowMs - 10_000);
    await writeFileWithMtime(path.join(baseDir, "b.txt"), "b", nowMs - 9_000);
    await writeFileWithMtime(path.join(baseDir, "c.txt"), "c", nowMs - 8_000);

    const report = await cleanupCacheDirectory({
      cacheDir: baseDir,
      ttlSeconds: 5,
      nowMs,
      dryRun: false,
      maxDeleteCount: 2,
      maxDeleteBytes: null
    });

    expect(report.expired_files).toBe(3);
    expect(report.deleted_files).toBe(2);

    const remaining = await fs.readdir(baseDir);
    expect(remaining.length).toBe(1);
  });
});
