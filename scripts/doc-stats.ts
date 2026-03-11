import { logger } from "../src/core/logger.js";
import { countChunksForDocId } from "../src/maintenance/documents.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const run = async () => {
  const args = process.argv.slice(2);
  const docId = getArgValue(args, "--doc-id");

  if (!docId) throw new Error("Usage: npm run doc:stats -- --doc-id <id>");

  const chunkCount = await countChunksForDocId(docId);

  process.stdout.write(JSON.stringify({ doc_id: docId, chunk_count: chunkCount }, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Doc stats failed");
  process.exitCode = 1;
});
