import { logger } from "../src/core/logger.js";
import { getChunkForDocIdByChunkId } from "../src/maintenance/chunks.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const run = async () => {
  const args = process.argv.slice(2);

  const docId = getArgValue(args, "--doc-id");
  const chunkId = getArgValue(args, "--chunk-id");

  if (!docId || !chunkId) {
    throw new Error("Usage: npm run chunk:get -- --doc-id <id> --chunk-id <sha256>");
  }

  const chunk = await getChunkForDocIdByChunkId({ docId, chunkId });
  if (!chunk) {
    throw new Error("Chunk not found for provided doc_id and chunk_id");
  }

  process.stdout.write(JSON.stringify(chunk, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Chunk get failed");
  process.exitCode = 1;
});
