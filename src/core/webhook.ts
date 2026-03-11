import { createHmac } from "node:crypto";

import { appConfig } from "../config/env.js";
import { logger } from "./logger.js";

const computeSignature = (secret: string, timestamp: string, body: string) =>
  createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");

export const emitWebhookEvent = async (eventName: string, payload: unknown) => {
  if (!appConfig.WEBHOOK_URL) return;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ event: eventName, ts: new Date().toISOString(), payload });

  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "x-docops-event": eventName,
    "x-docops-timestamp": timestamp
  };

  if (appConfig.WEBHOOK_SECRET) {
    headers["x-docops-signature"] = computeSignature(appConfig.WEBHOOK_SECRET, timestamp, body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), appConfig.WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(appConfig.WEBHOOK_URL, {
      method: "POST",
      headers,
      body,
      signal: controller.signal
    });

    if (!response.ok) {
      logger.warn({ status: response.status, eventName }, "Webhook delivery failed");
    }
  } catch (error) {
    logger.warn({ err: error, eventName }, "Webhook delivery error");
  } finally {
    clearTimeout(timeoutId);
  }
};
