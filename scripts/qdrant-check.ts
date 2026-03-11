import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { qdrantClient } from "../src/core/qdrant.js";

const run = async () => {
  const headers: Record<string, string> = {};
  if (appConfig.QDRANT_API_KEY) headers["api-key"] = appConfig.QDRANT_API_KEY;

  const rootResponse = await fetch(appConfig.QDRANT_URL, { headers });
  const rootText = await rootResponse.text();

  const collections = await qdrantClient.getCollections();

  process.stdout.write(
    JSON.stringify(
      {
        qdrant_url: appConfig.QDRANT_URL,
        root_status: rootResponse.status,
        root_body: rootText,
        collections: collections.collections.map((c) => c.name)
      },
      null,
      2
    ) + "\n"
  );
};

run().catch((error) => {
  logger.error({ err: error }, "Qdrant check failed");
  process.exitCode = 1;
});
