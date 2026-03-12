import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { getDocRegistryEntry } from "../src/maintenance/docRegistry.js";
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
  if (!docId) throw new Error("Usage: npm run doc:info -- --doc-id <id>");

  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  const entry = await getDocRegistryEntry({ registryCollectionName, docId });

  if (!entry) throw new Error("Doc registry entry not found");

  process.stdout.write(JSON.stringify(entry, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Doc info failed");
  process.exitCode = 1;
});
