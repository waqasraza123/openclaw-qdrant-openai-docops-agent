import http from "node:http";

import { appConfig } from "../config/env.js";
import { logger } from "../core/logger.js";
import { AsyncSemaphore } from "../core/semaphore.js";
import { FixedWindowRateLimiter } from "../core/rateLimit.js";
import { answerQuestionWithGrounding } from "../answer/ask.js";
import { extractPdfText } from "../ingest/pdf.js";
import { createDocumentChunks } from "../ingest/chunk.js";
import { embedChunks } from "../ingest/embed.js";
import { upsertEmbeddedChunks } from "../ingest/store.js";
import { emitWebhookEvent } from "../core/webhook.js";

const semaphore = new AsyncSemaphore(appConfig.MAX_CONCURRENT_REQUESTS);
const rateLimiter = new FixedWindowRateLimiter(appConfig.RATE_LIMIT_RPM);

const readRequestBody = async (req: http.IncomingMessage, maxBytes: number) => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > maxBytes) throw new Error("Request body too large");
    chunks.push(buf);
  }

  return Buffer.concat(chunks).toString("utf8");
};

const writeJson = (res: http.ServerResponse, statusCode: number, payload: unknown) => {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(body);
};

const runAsk = async (docId: string, question: string) => {
  const result = await answerQuestionWithGrounding({ docId, question });
  return {
    doc_id: docId,
    output: result.output,
    sources: result.sources,
    timings: result.timings
  };
};

const runIngest = async (docId: string, pdfPath: string) => {
  const startedAt = Date.now();
  const { text } = await extractPdfText(pdfPath);
  const chunks = createDocumentChunks({ docId, sourcePath: pdfPath, fullText: text });
  const { embeddedChunks, cacheHitCount, embeddedCount } = await embedChunks(chunks);
  const stored = await upsertEmbeddedChunks({
    collectionName: appConfig.QDRANT_COLLECTION,
    embeddedChunks
  });

  const summary = {
    doc_id: docId,
    pdf_path: pdfPath,
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

const server = http.createServer(async (req, res) => {
  const release = await semaphore.acquire();

  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const method = req.method ?? "GET";

    if (method === "GET" && url.pathname === "/health") {
      return writeJson(res, 200, { ok: true });
    }

    if (method !== "POST") {
      return writeJson(res, 405, { error: "Method not allowed" });
    }

    const requestBody = await readRequestBody(req, 1_000_000);
    const parsed = JSON.parse(requestBody) as Record<string, unknown>;

    if (url.pathname === "/v1/ask") {
      const now = Date.now();
      if (!rateLimiter.allowRequest(now)) {
        return writeJson(res, 429, { error: "Rate limit exceeded" });
      }

      const docId = typeof parsed.doc_id === "string" ? parsed.doc_id : null;
      const question = typeof parsed.question === "string" ? parsed.question : null;
      if (!docId || !question) return writeJson(res, 400, { error: "doc_id and question are required" });

      const result = await runAsk(docId, question);
      return writeJson(res, 200, result);
    }

    if (url.pathname === "/v1/ingest") {
      const docId = typeof parsed.doc_id === "string" ? parsed.doc_id : null;
      const pdfPath = typeof parsed.pdf_path === "string" ? parsed.pdf_path : null;
      if (!docId || !pdfPath) return writeJson(res, 400, { error: "doc_id and pdf_path are required" });

      const result = await runIngest(docId, pdfPath);
      return writeJson(res, 200, result);
    }

    return writeJson(res, 404, { error: "Not found" });
  } catch (error) {
    logger.error({ err: error }, "Server error");
    return writeJson(res, 500, { error: "Internal server error" });
  } finally {
    release();
  }
});

server.listen(appConfig.SERVER_PORT, () => {
  logger.info({ port: appConfig.SERVER_PORT }, "Server listening");
});
