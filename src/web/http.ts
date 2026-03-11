import http from "node:http";

export const readRequestBodyText = async (req: http.IncomingMessage, maxBytes: number) => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) throw new Error("Request body too large");
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
};

export const parseJsonBody = (raw: string) => {
  if (raw.trim().length == 0) return {};
  return JSON.parse(raw) as unknown;
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
