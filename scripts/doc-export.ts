import fs from "node:fs/promises";
import path from "node:path";

import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { exportChunksForDocId } from "../src/maintenance/docExport.js";

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

  const docId = getArgValue(args, "--doc-id");
  const maxChunksArg = getArgValue(args, "--max-chunks");
  const pageSizeArg = getArgValue(args, "--page-size");
  const outPathArg = getArgValue(args, "--out");

  if (!docId) throw new Error("Usage: npm run doc:export -- --doc-id <id> [--max-chunks N] [--page-size N] [--out path]");

  const maxChunks = maxChunksArg ? parsePositiveInt(maxChunksArg, "max-chunks") : appConfig.MAX_CHUNKS_PER_DOC;
  const pageSize = pageSizeArg ? parsePositiveInt(pageSizeArg, "page-size") : appConfig.QDRANT_BATCH_SIZE;

  const result = await exportChunksForDocId({
    collectionName: appConfig.QDRANT_COLLECTION,
    docId,
    maxChunks,
    pageSize
  });

  const resolvedOutPath = outPathArg
    ? path.resolve(outPathArg)
    : path.resolve("tmp", "docs", `${docId}-chunks.json`);

  await fs.mkdir(path.dirname(resolvedOutPath), { recursive: true });

  const payload = {
    doc_id: docId,
    chunk_count: result.chunks.length,
    scanned_points: result.scannedPoints,
    chunks: result.chunks
  };

  await fs.writeFile(resolvedOutPath, JSON.stringify(payload, null, 2), "utf8");

  process.stdout.write(JSON.stringify({ doc_id: docId, out_path: resolvedOutPath, chunk_count: result.chunks.length }, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Doc export failed");
  process.exitCode = 1;
});
