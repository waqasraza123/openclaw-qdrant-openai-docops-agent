import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { deleteDocRegistryEntry } from "../src/maintenance/docRegistry.js";
import { deleteChunksForDocId } from "../src/maintenance/documents.js";
import { getDocRegistryCollectionName } from "../src/maintenance/registryNaming.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const run = async () => {
  const args = process.argv.slice(2);
  const docId = getArgValue(args, "--doc-id");
  const confirm = getArgValue(args, "--confirm");

  if (!docId || !confirm) {
    throw new Error("Usage: npm run doc:delete -- --doc-id <id> --confirm <id>");
  }

  if (confirm !== docId) {
    throw new Error("Confirm value must match doc-id exactly");
  }

  await deleteChunksForDocId(docId);

  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  await deleteDocRegistryEntry({ registryCollectionName, docId });

  process.stdout.write(JSON.stringify({ doc_id: docId, deleted: true, registry_deleted: true }, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Doc delete failed");
  process.exitCode = 1;
});
