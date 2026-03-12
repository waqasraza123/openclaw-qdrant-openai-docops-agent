import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { createEmbeddingVectors } from "../src/core/openai.js";
import { qdrantClient } from "../src/core/qdrant.js";
import { runDiagnostics } from "../src/maintenance/diagnostics.js";

const measureMs = async <T>(operation: () => Promise<T>) => {
  const startedAt = Date.now();
  const result = await operation();
  const elapsedMs = Date.now() - startedAt;
  return { result, elapsedMs };
};

const run = async () => {
  const startedAtIso = new Date().toISOString();

  const diagnostics = await runDiagnostics({
    startedAtIso,
    nowIso: () => new Date().toISOString(),
    measureMs,
    getQdrantCollections: async () => await qdrantClient.getCollections(),
    createEmbeddings: async (inputs: string[]) => {
      const { vectors } = await createEmbeddingVectors(inputs);
      return { vectors };
    },
    embedModel: appConfig.OPENAI_EMBED_MODEL,
    probeText: "diagnostics ping"
  });

  process.stdout.write(JSON.stringify(diagnostics, null, 2) + "\n");

  if (!diagnostics.ok) process.exitCode = 1;
};

run().catch((error) => {
  logger.error({ err: error }, "Diagnostics failed");
  process.exitCode = 1;
});
