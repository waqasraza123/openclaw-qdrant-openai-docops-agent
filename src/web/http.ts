import type http from "node:http";

export class HttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const isHttpError = (error: unknown): error is HttpError => {
  if (typeof error !== "object" || error === null) return false;
  const record = error as Record<string, unknown>;
  return typeof record["statusCode"] === "number" && typeof record["message"] === "string";
};

export const readRequestBodyText = async (req: http.IncomingMessage, maxBytes: number) => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) throw new HttpError(413, "Request body too large");
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
};

export const parseJsonBody = (raw: string) => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return {};
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
};

export const writeJsonResponse = (res: http.ServerResponse, statusCode: number, payload: unknown) => {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(body);
};

export const getRequestId = (req: http.IncomingMessage) => {
  const headerValue = req.headers["x-request-id"];
  if (typeof headerValue === "string" && headerValue.trim().length > 0) return headerValue.trim();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
