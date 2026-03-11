import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { appConfig } from "../config/env.js";
import { answerQuestionWithGrounding } from "../answer/ask.js";
import { loadEvalSetFromFile } from "../eval/set.js";
import { judgeAuditCase } from "../eval/judge.js";
import { buildAuditReport, writeAuditReportFiles } from "../eval/report.js";
import { createContextLogger, logger } from "../core/logger.js";
import { FixedWindowRateLimiter } from "../core/rateLimit.js";
import { AsyncSemaphore } from "../core/semaphore.js";
import { emitWebhookEvent } from "../core/webhook.js";
import { qdrantClient } from "../core/qdrant.js";
import { createDocumentChunks } from "../ingest/chunk.js";
import { embedChunks } from "../ingest/embed.js";
import { extractPdfText } from "../ingest/pdf.js";
import { upsertEmbeddedChunks } from "../ingest/store.js";
import { countChunksForDocId, deleteChunksForDocId } from "../maintenance/documents.js";
import { getRequestId, parseJsonBody, readRequestBodyText, writeJsonResponse } from "./http.js";
import {
  AskRequestSchema,
  AuditRunRequestSchema,
  DocDeleteRequestSchema,
  DocStatsRequestSchema,
  IngestRequestSchema
} from "./schemas.js";

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

const handleQdrantCheck = async () => {
  const headers: Record<string, string> = {};
  if (appConfig.QDRANT_API_KEY) headers["api-key"] = appConfig.QDRANT_API_KEY;

  const rootResponse = await fetch(appConfig.QDRANT_URL, { headers });
  const rootBody = await rootResponse.text();
  const collections = await qdrantClient.getCollections();

  return {
    qdrant_url: appConfig.QDRANT_URL,
    root_status: rootResponse.status,
    root_body: rootBody,
    collections: collections.collections.map((c) => c.name)
  };
};

const handleIngest = async (requestId: string, body: unknown) => {
  const parsed = IngestRequestSchema.parse(body);

  const resolvedPdfPath = path.resolve(parsed.pdf_path);
  const exists = await fileExists(resolvedPdfPath);
  if (!exists) throw new Error(`PDF not found: ${resolvedPdfPath}`);

  const contextLogger = createContextLogger({
    op: "http.ingest",
    requestId,
    docId: parsed.doc_id
  });

  if (parsed.replace) {
    await deleteChunksForDocId(parsed.doc_id);
  }

  const startedAt = Date.now();
  const { text, pageCount } = await extractPdfText(resolvedPdfPath);

  contextLogger.info({ pageCount, extractedChars: text.length }, "Extracted PDF text");

  const chunks = createDocumentChunks({
    docId: parsed.doc_id,
    sourcePath: resolvedPdfPath,
    fullText: text
  });

  const { embeddedChunks, cacheHitCount, embeddedCount } = await embedChunks(chunks);

  const stored = await upsertEmbeddedChunks({
    collectionName: appConfig.QDRANT_COLLECTION,
    embeddedChunks
  });

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

  await emitWebhookEvent("ingest.completed", summary);

  return summary;
};

const handleAsk = async (requestId: string, body: unknown) => {
  const parsed = AskRequestSchema.parse(body);

  const now = Date.now();
  if (!askRateLimiter.allowRequest(now)) {
    return { statusCode: 429, payload: { error: "Rate limit exceeded" } };
  }

  const contextLogger = createContextLogger({
    op: "http.ask",
    requestId,
    docId: parsed.doc_id
  });

  contextLogger.info({ questionLength: parsed.question.length }, "Starting ask");

  const result = await answerQuestionWithGrounding({
    docId: parsed.doc_id,
    question: parsed.question
  });

  return {
    statusCode: 200,
    payload: {
      doc_id: parsed.doc_id,
      output: result.output,
      sources: result.sources,
      timings: result.timings
    }
  };
};

const handleAuditRun = async (requestId: string, body: unknown) => {
  const parsed = AuditRunRequestSchema.parse(body);

  const contextLogger = createContextLogger({
    op: "http.audit.run",
    requestId,
    docId: parsed.doc_id
  });

  const resolvedSetPath = path.resolve(parsed.eval_set_path);
  const evalItems = await loadEvalSetFromFile(resolvedSetPath);

  const cases = [];
  for (const item of evalItems) {
    if (item.doc_id !== parsed.doc_id) continue;

    const result = await answerQuestionWithGrounding({
      docId: item.doc_id,
      question: item.question
    });

    const judged = judgeAuditCase({
      evalItem: item,
      output: result.output,
      timings: result.timings
    });

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

  return {
    summary: report.summary,
    report_json_path: jsonPath,
    report_md_path: mdPath
  };
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

  return { statusCode: 200, payload: { doc_id: parsed.doc_id, deleted: true } };
};

const server = http.createServer(async (req, res) => {
  const release = await concurrencySemaphore.acquire();
  const requestId = getRequestId(req);

  res.setHeader("x-request-id", requestId);

  try {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (method == "GET" and url.pathname == "/health") {
      return writeJsonResponse(res, 200, { ok: True })
    }
  } catch:
    pass
})
