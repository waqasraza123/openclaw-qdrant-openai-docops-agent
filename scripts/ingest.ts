import fs from "node:fs/promises";
import path from "node:path";

import { appConfig } from "../src/config/env.js";
import { createContextLogger, logger } from "../src/core/logger.js";
import { emitWebhookEvent } from "../src/core/webhook.js";
import { deleteChunksForDocId } from "../src/maintenance/documents.js";
import { sha256Hex } from "../src/core/ids.js";
import { getDocRegistryEntry, upsertDocRegistryEntry } from "../src/maintenance/docRegistry.js";
import { getDocRegistryCollectionName } from "../src/maintenance/registryNaming.js";
import { buildDocRegistryEntry, computeDocumentContentHash, resolveRegistryTimestamps } from "../src/ingest/registry.js";
import { createDocumentChunks } from "../src/ingest/chunk.js";
import { embedChunks } from "../src/ingest/embed.js";
import { extractPdfText } from "../src/ingest/pdf.js";
import { evaluateSkipUnchangedIngest } from "../src/ingest/skipPolicy.js";
import { upsertEmbeddedChunks } from "../src/ingest/store.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const run = async () => {
  const args = process.argv.slice(2);

  const pdfPath = getArgValue(args, "--pdf");
  const docId = getArgValue(args, "--doc-id");
  const replace = getArgValue(args, "--replace");
  const skipUnchanged = getArgValue(args, "--skip-unchanged");

  if (!pdfPath || !docId) {
    throw new Error("Usage: npm run ingest -- --pdf <path> --doc-id <id> [--replace true] [--skip-unchanged true]");
  }

  const resolvedPdfPath = path.resolve(pdfPath);
  const exists = await fileExists(resolvedPdfPath);
  if (!exists) throw new Error(`PDF not found: ${resolvedPdfPath}`);

  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const contextualLogger = createContextLogger({ op: "ingest", requestId, docId });

  if (replace === "true") {
    contextualLogger.info("Replacing existing doc vectors");
    await deleteChunksForDocId(docId);
  }

  const startedAt = Date.now();
  const { text, pageCount } = await extractPdfText(resolvedPdfPath);

  const skipRequested = skipUnchanged === "true";
  const replaceRequested = replace === "true";

  if (skipRequested && !replaceRequested) {
    const registryCollectionNameForSkip = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
    const existingRegistryEntryForSkip = await getDocRegistryEntry({
      registryCollectionName: registryCollectionNameForSkip,
      docId
    });

    const contentHashForSkip = computeDocumentContentHash(text, (input) => sha256Hex(input));

    const decision = evaluateSkipUnchangedIngest({
      skipRequested: true,
      replaceRequested: false,
      existingEntry: existingRegistryEntryForSkip,
      contentHash: contentHashForSkip,
      embedModel: appConfig.OPENAI_EMBED_MODEL,
      chunkMaxTokens: appConfig.CHUNK_MAX_TOKENS,
      chunkOverlapTokens: appConfig.CHUNK_OVERLAP_TOKENS
    });

    if (decision.should_skip) {
      const summary = {
        doc_id: docId,
        pdf_path: resolvedPdfPath,
        skipped: true,
        reason: decision.reason,
        duration_ms: Date.now() - startedAt
      };

      await emitWebhookEvent("ingest.skipped", summary);
      contextualLogger.info(summary, "Ingestion skipped");
      process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
      return;
    }
  }

  contextualLogger.info({ pageCount, extractedChars: text.length }, "Extracted PDF text");

  const chunks = createDocumentChunks({ docId, sourcePath: resolvedPdfPath, fullText: text });
  contextualLogger.info({ chunkCount: chunks.length }, "Created chunks");

  const { embeddedChunks, cacheHitCount, embeddedCount } = await embedChunks(chunks);
  contextualLogger.info({ cacheHitCount, embeddedCount }, "Embeddings ready");

  const { upsertedCount, vectorSize } = await upsertEmbeddedChunks({
    collectionName: appConfig.QDRANT_COLLECTION,
    embeddedChunks
  });

  const durationMs = Date.now() - startedAt;

  const summary = {
    doc_id: docId,
    pdf_path: resolvedPdfPath,
    chunks_total: chunks.length,
    cache_hits: cacheHitCount,
    embedded_new: embeddedCount,
    upserted: upsertedCount,
    vector_size: vectorSize,
    duration_ms: durationMs
  };

  
  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  const existingRegistryEntry = await getDocRegistryEntry({ registryCollectionName, docId });
  const nowIso = new Date().toISOString();
  const timestamps = resolveRegistryTimestamps({ existingCreatedAtIso: existingRegistryEntry ? existingRegistryEntry.created_at : null, nowIso });
  const contentHash = computeDocumentContentHash(text, (input) => sha256Hex(input));
  const registryEntry = buildDocRegistryEntry({
    docId,
    sourcePath: resolvedPdfPath,
    pageCount,
    chunkCount: chunks.length,
    contentHash,
    embedModel: appConfig.OPENAI_EMBED_MODEL,
    chunkMaxTokens: appConfig.CHUNK_MAX_TOKENS,
    chunkOverlapTokens: appConfig.CHUNK_OVERLAP_TOKENS,
    createdAtIso: timestamps.createdAtIso,
    updatedAtIso: timestamps.updatedAtIso
  });
  await upsertDocRegistryEntry({ registryCollectionName, entry: registryEntry });

  await emitWebhookEvent("ingest.completed", summary);

  contextualLogger.info(summary, "Ingestion complete");
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Ingest failed");
  process.exitCode = 1;
});
