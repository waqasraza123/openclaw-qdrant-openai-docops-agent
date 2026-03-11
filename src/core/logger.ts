import pino from "pino";

import { appConfig } from "../config/env.js";

const transport =
  appConfig.LOG_JSON
    ? undefined
    : pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" }
      });

export const logger = pino(
  {
    level: appConfig.LOG_LEVEL,
    redact: {
      paths: [
        "OPENAI_API_KEY",
        "QDRANT_API_KEY",
        "WEBHOOK_SECRET",
        "req.headers.authorization",
        "req.headers.cookie"
      ],
      remove: true
    }
  },
  transport
);

export const createContextLogger = (context: Record<string, unknown>) => logger.child(context);
