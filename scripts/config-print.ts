import { logger } from "../src/core/logger.js";
import { buildConfigSnapshot } from "../src/maintenance/configSnapshot.js";

const run = async () => {
  const snapshot = buildConfigSnapshot();
  process.stdout.write(JSON.stringify(snapshot, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Config print failed");
  process.exitCode = 1;
});
