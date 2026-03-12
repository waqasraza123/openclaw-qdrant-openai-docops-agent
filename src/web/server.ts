import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { answerQuestionWithGrounding } from "../answer/ask.js";
import { retrieveSourcesForQuestion } from "../retrieve/search.js";
import { formatRetrievedSources } from "../retrieve/format.js";
import { buildAskTraceArtifact, getDefaultTraceDirectory, persistAskTraceArtifact } from "../answer/traceArtifact.js";
import { appConfig } from "../config/env.js";
import { buildConfigSnapshot } from "../maintenance/configSnapshot.js";

import { AsyncSemaphore } from "../core/semaphore.js";
import { FixedWindowRateLimiter } from "../core/rateLimit.js";
import { createContextLogger, logger } from "../core/logger.js";
import { emitWebhookEvent } from "../core/webhook.js";
import { qdrantClient } from "../core/qdrant.js";
import { createEmbeddingVectors } from "../core/openai.js";
import { runDiagnostics } from "../maintenance/diagnostics.js";
import { sha256Hex } from "../core/ids.js";
import {
  getDocRegistryEntry, upsertDocRegistryEntry, listDocRegistryEntries,
  deleteDocRegistryEntry
} from "../maintenance/docRegistry.js";
import { getDocRegistryCollectionName } from "../maintenance/registryNaming.js";
import { buildDocRegistryEntry, computeDocumentContentHash, resolveRegistryTimestamps } from "../ingest/registry.js";
import { createDocumentChunks } from "../ingest/chunk.js";
import { embedChunks } from "../ingest/embed.js";
import { extractPdfText } from "../ingest/pdf.js";
import { evaluateSkipUnchangedIngest } from "../ingest/skipPolicy.js";
import { upsertEmbeddedChunks } from "../ingest/store.js";
import { countChunksForDocId, deleteChunksForDocId } from "../maintenance/documents.js";
import { getChunkForDocIdByChunkId } from "../maintenance/chunks.js";
import { listDocIdsInCollection } from "../maintenance/docList.js";
import { exportChunksForDocId } from "../maintenance/docExport.js";
import { loadEvalSetFromFile } from "../eval/set.js";
import { judgeAuditCase } from "../eval/judge.js";
import { buildAuditReport, writeAuditReportFiles } from "../eval/report.js";
import {
  AuditRunRequestSchema,
  AskRequestSchema,
  ChunkGetRequestSchema,
  DocDeleteRequestSchema,
  DocExportRequestSchema,
  DocStatsRequestSchema,
  DocsListRequestSchema,
  IngestRequestSchema,
  RegistryGetRequestSchema,
  RegistryListRequestSchema,
  DiagnosticsRunRequestSchema
} from "./schemas.js";
import { RetrieveRequestSchema } from "./schemas.js";
import { getRequestId, isHttpError, parseJsonBody, readRequestBodyText, writeJsonResponse, HttpError } from "./http.js";
import { formatZodValidationError } from "./validationErrors.js";

const requestBodyMaxBytes = 1_000_000;

const askRateLimiter = new FixedWindowRateLimiter(appConfig.RATE_LIMIT_RPM);
const concurrencySemaphore = new AsyncSemaphore(appConfig.MAX_CONCURRENT_REQUESTS);

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const parseBodyForPost = async (req: http.IncomingMessage) => {
  const raw = await readRequestBodyText(req, requestBodyMaxBytes);
  return parseJsonBody(raw);
};

const handleQdrantCheck = async () => {
  const collections = await qdrantClient.getCollections();
  return { qdrant_url: appConfig.QDRANT_URL, collections: collections.collections.map((c) => c.name) };
};

const handleIngest = async (requestId: string, body: unknown) => {
  const parsed = IngestRequestSchema.parse(body);

  const resolvedPdfPath = path.resolve(parsed.pdf_path);
  const exists = await fileExists(resolvedPdfPath);
  if (!exists) throw new HttpError(400, "PDF not found: " + resolvedPdfPath);

  const contextLogger = createContextLogger({ op: "http.ingest", requestId, docId: parsed.doc_id });

  if (parsed.replace) {
    contextLogger.info("Replacing existing doc vectors");
    await deleteChunksForDocId(parsed.doc_id);
  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  await deleteDocRegistryEntry({ registryCollectionName, docId: parsed.doc_id });

  }

  const startedAt = Date.now();
  const { text, pageCount } = await extractPdfText(resolvedPdfPath);

  if (parsed.skip_unchanged && !parsed.replace) {
    const registryCollectionNameForSkip = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
    const existingRegistryEntryForSkip = await getDocRegistryEntry({
      registryCollectionName: registryCollectionNameForSkip,
      docId: parsed.doc_id
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
        doc_id: parsed.doc_id,
        pdf_path: resolvedPdfPath,
        skipped: true,
        reason: decision.reason,
        duration_ms: Date.now() - startedAt
      };

      await emitWebhookEvent("ingest.skipped", summary);
      return summary;
    }
  }

  contextLogger.info({ pageCount, extractedChars: text.length }, "Extracted PDF text");

  const chunks = createDocumentChunks({ docId: parsed.doc_id, sourcePath: resolvedPdfPath, fullText: text });
  const { embeddedChunks, cacheHitCount, embeddedCount } = await embedChunks(chunks);

  const stored = await upsertEmbeddedChunks({ collectionName: appConfig.QDRANT_COLLECTION, embeddedChunks });

  const summary = {
    doc_id: parsed.doc_id,
    pdf_path: resolvedPdfPath,
    chunks_total: chunks.length,
    cache_hits: cacheHitCount,
    embedded_new: embeddedCount,
    upserted: stored.upsertedCount,
    vector_size: stored.vectorSize,
    duration_ms: Date.now() - startedAt
  };

    const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  const existingRegistryEntry = await getDocRegistryEntry({ registryCollectionName, docId: parsed.doc_id });
  const nowIso = new Date().toISOString();
  const timestamps = resolveRegistryTimestamps({ existingCreatedAtIso: existingRegistryEntry ? existingRegistryEntry.created_at : null, nowIso });
  const contentHash = computeDocumentContentHash(text, (input) => sha256Hex(input));
  const registryEntry = buildDocRegistryEntry({
    docId: parsed.doc_id,
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

  return summary;
};

const handleAsk = async (requestId: string, body: unknown) => {
  const parsed = AskRequestSchema.parse(body);

  const now = Date.now();
  if (!askRateLimiter.allowRequest(now)) {
    return { statusCode: 429, payload: { error: "Rate limit exceeded" } };
  }

  const contextLogger = createContextLogger({ op: "http.ask", requestId, docId: parsed.doc_id });
  contextLogger.info({ questionLength: parsed.question.length }, "Starting ask");

  const result = await answerQuestionWithGrounding({ docId: parsed.doc_id, question: parsed.question, requestId, includeTrace: parsed.trace });

  let trace_path: string | null = null;

  if (parsed.trace && result.trace) {
    const createdAtIso = new Date().toISOString();
    const artifact = buildAskTraceArtifact({
      trace: result.trace,
      docId: parsed.doc_id,
      question: parsed.question,
      createdAtIso,
      model: appConfig.OPENAI_MODEL,
      embedModel: appConfig.OPENAI_EMBED_MODEL,
      qdrantCollection: appConfig.QDRANT_COLLECTION,
      output: result.output,
      sources: result.sources,
      timings: result.timings
    });

    const directoryPath = getDefaultTraceDirectory(appConfig.CACHE_DIR);
    trace_path = await persistAskTraceArtifact({ artifact, directoryPath });
  }


  return {
    statusCode: 200,
    payload: { doc_id: parsed.doc_id, output: result.output, sources: result.sources, timings: result.timings, trace_path }
  };
};

const handleAuditRun = async (requestId: string, body: unknown) => {
  const parsed = AuditRunRequestSchema.parse(body);

  const contextLogger = createContextLogger({ op: "http.audit.run", requestId, docId: parsed.doc_id });

  const resolvedSetPath = path.resolve(parsed.eval_set_path);
  const evalItems = await loadEvalSetFromFile(resolvedSetPath);

  const cases = [];
  for (const item of evalItems) {
    if (item.doc_id !== parsed.doc_id) continue;

    const result = await answerQuestionWithGrounding({ docId: item.doc_id, question: item.question });
    const judged = judgeAuditCase({ evalItem: item, output: result.output, timings: result.timings });
    cases.push(judged);

    if (!judged.passed && appConfig.AUDIT_FAIL_FAST) break;
  }

  const report = buildAuditReport(cases);
  const jsonPath = "tmp/audit-report.json";
  const mdPath = "tmp/audit-report.md";

  await writeAuditReportFiles({ report, jsonPath, mdPath });

  await emitWebhookEvent("audit.completed", {
    doc_id: parsed.doc_id,
    pass_rate: report.summary.pass_rate,
    refusal_rate: report.summary.refusal_rate,
    report_json_path: jsonPath,
    report_md_path: mdPath
  });

  contextLogger.info({ total: report.summary.total, passRate: report.summary.pass_rate }, "Audit completed");

  return { summary: report.summary, report_json_path: jsonPath, report_md_path: mdPath };
};

const handleDocStats = async (body: unknown) => {
  const parsed = DocStatsRequestSchema.parse(body);
  const count = await countChunksForDocId(parsed.doc_id);
  return { doc_id: parsed.doc_id, chunk_count: count };
};

const handleDocDelete = async (body: unknown) => {
  const parsed = DocDeleteRequestSchema.parse(body);
  if (parsed.confirm !== parsed.doc_id) {
    return { statusCode: 400, payload: { error: "Confirm must match doc_id exactly" } };
  }

  await deleteChunksForDocId(parsed.doc_id);
  await emitWebhookEvent("doc.deleted", { doc_id: parsed.doc_id });

  return { statusCode: 200, payload: { doc_id: parsed.doc_id, deleted: true, registry_deleted: true } };
};

const handleChunkGet = async (body: unknown) => {
  const parsed = ChunkGetRequestSchema.parse(body);
  const chunk = await getChunkForDocIdByChunkId({ docId: parsed.doc_id, chunkId: parsed.chunk_id });
  if (!chunk) {
    return { statusCode: 404, payload: { error: "Chunk not found" } };
  }
  return { statusCode: 200, payload: chunk };
};

const handleDocsList = async (body: unknown) => {
  const parsed = DocsListRequestSchema.parse(body);

  const maxPointsToScan = parsed.max_scan ?? appConfig.MAX_CHUNKS_PER_DOC;
  const pageSize = parsed.page_size ?? appConfig.QDRANT_BATCH_SIZE;

  const result = await listDocIdsInCollection({
    collectionName: appConfig.QDRANT_COLLECTION,
    maxPointsToScan,
    pageSize
  });

  return { doc_ids: result.docIds, scanned_points: result.scannedPoints };
};

const handleDocExport = async (body: unknown) => {
  const parsed = DocExportRequestSchema.parse(body);

  const maxChunks = parsed.max_chunks ?? appConfig.MAX_CHUNKS_PER_DOC;
  const pageSize = parsed.page_size ?? appConfig.QDRANT_BATCH_SIZE;

  const result = await exportChunksForDocId({
    collectionName: appConfig.QDRANT_COLLECTION,
    docId: parsed.doc_id,
    maxChunks,
    pageSize
  });

  return { doc_id: parsed.doc_id, chunk_count: result.chunks.length, scanned_points: result.scannedPoints, chunks: result.chunks };
};

const handleRegistryGet = async (body: unknown) => {
  const parsed = RegistryGetRequestSchema.parse(body);
  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  const entry = await getDocRegistryEntry({ registryCollectionName, docId: parsed.doc_id });
  if (!entry) return { statusCode: 404, payload: { error: "Doc not found in registry" } };
  return { statusCode: 200, payload: entry };
};

const handleRegistryList = async (body: unknown) => {
  const parsed = RegistryListRequestSchema.parse(body);
  const registryCollectionName = getDocRegistryCollectionName(appConfig.QDRANT_COLLECTION);
  const maxDocs = parsed.max_docs ?? 1000;
  const pageSize = parsed.page_size ?? appConfig.QDRANT_BATCH_SIZE;
  const result = await listDocRegistryEntries({ registryCollectionName, maxDocs, pageSize });
  return {
    statusCode: 200,
    payload: {
      registry_collection: registryCollectionName,
      entries: result.entries,
      scanned_points: result.scannedPoints
    }
  };
};

const handleRetrieve = async (requestId: string, body: unknown) => {
  const parsed = RetrieveRequestSchema.parse(body);

  const topK = parsed.top_k ?? appConfig.TOP_K;
  const minScore = parsed.min_score ?? appConfig.MIN_SCORE;

  const retrieved = await retrieveSourcesForQuestion({
    docId: parsed.doc_id,
    question: parsed.question,
    topK,
    minScore
  });

  const sources = formatRetrievedSources({ sources: retrieved.sources, includeText: parsed.include_text });

  return {
    statusCode: 200,
    payload: {
      request_id: requestId,
      doc_id: parsed.doc_id,
      question: parsed.question,
      sources,
      timings: { retrieval_ms: retrieved.retrievalMs }
    }
  };
};

const handleDiagnosticsRun = async (body: unknown) => {
  const parsed = DiagnosticsRunRequestSchema.parse(body);

  const measureMs = async <T>(operation: () => Promise<T>) => {
    const startedAt = Date.now();
    const result = await operation();
    const elapsedMs = Date.now() - startedAt;
    return { result, elapsedMs };
  };

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
    probeText: "diagnostics ping",
    includeOpenAi: parsed.include_openai
  });

  const statusCode = diagnostics.ok ? 200 : 503;
  return { statusCode, payload: diagnostics };
};

const server = http.createServer(async (req, res) => {
  const release = await concurrencySemaphore.acquire();
  const requestId = getRequestId(req);

  res.setHeader("x-request-id", requestId);

  try {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://" + (req.headers.host ?? "localhost"));

    if (method === "GET" && url.pathname === "/health") {
      return writeJsonResponse(res, 200, { ok: true });
    }

    if (method !== "POST") {
      return writeJsonResponse(res, 405, { error: "Method not allowed" });
    }

    const body = await parseBodyForPost(req);

        if (url.pathname === "/v1/config/snapshot") {
      const snapshot = buildConfigSnapshot();
      return writeJsonResponse(res, 200, snapshot);
    }

if (url.pathname === "/v1/qdrant/check") {
      const result = await handleQdrantCheck();
      return writeJsonResponse(res, 200, result);
    }

    if (url.pathname === "/v1/ingest") {
      const result = await handleIngest(requestId, body);
      return writeJsonResponse(res, 200, result);
    }

        if (url.pathname === "/v1/retrieve") {
      const handled = await handleRetrieve(requestId, body);
      return writeJsonResponse(res, handled.statusCode, handled.payload);
    }

    if (url.pathname === "/v1/diagnostics/run") {
      const handled = await handleDiagnosticsRun(body);
      return writeJsonResponse(res, handled.statusCode, handled.payload);
    }

if (url.pathname === "/v1/ask") {
      const handled = await handleAsk(requestId, body);
      return writeJsonResponse(res, handled.statusCode, handled.payload);
    }

    if (url.pathname === "/v1/audit/run") {
      const result = await handleAuditRun(requestId, body);
      return writeJsonResponse(res, 200, result);
    }

    if (url.pathname === "/v1/docs/stats") {
      const result = await handleDocStats(body);
      return writeJsonResponse(res, 200, result);
    }

    if (url.pathname === "/v1/docs/delete") {
      const handled = await handleDocDelete(body);
      return writeJsonResponse(res, handled.statusCode, handled.payload);
    }

    if (url.pathname === "/v1/docs/list") {
      const result = await handleDocsList(body);
      return writeJsonResponse(res, 200, result);
    }

    if (url.pathname === "/v1/docs/export") {
      const result = await handleDocExport(body);
      return writeJsonResponse(res, 200, result);
    }

        if (url.pathname === "/v1/registry/get") {
      const handled = await handleRegistryGet(body);
      return writeJsonResponse(res, handled.statusCode, handled.payload);
    }

    if (url.pathname === "/v1/registry/list") {
      const handled = await handleRegistryList(body);
      return writeJsonResponse(res, handled.statusCode, handled.payload);
    }

if (url.pathname === "/v1/chunks/get") {
      const handled = await handleChunkGet(body);
      return writeJsonResponse(res, handled.statusCode, handled.payload);
    }

    return writeJsonResponse(res, 404, { error: "Not found" });
  } catch (error) {
    if (isHttpError(error)) {
      return writeJsonResponse(res, error.statusCode, { error: error.message });
    }

    const validation = formatZodValidationError(error);
    if (validation) {
      return writeJsonResponse(res, validation.statusCode, validation.payload);
    }


    logger.error({ err: error, requestId }, "Request failed");
    return writeJsonResponse(res, 500, { error: "Internal server error", request_id: requestId });
  } finally {
    release();
  }
});

server.listen(appConfig.SERVER_PORT, () => {
  logger.info({ port: appConfig.SERVER_PORT }, "Server listening");
});
