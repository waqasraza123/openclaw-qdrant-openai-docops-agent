import "dotenv/config";
import { z } from "zod";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const booleanFromString = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  OPENAI_EMBED_MODEL: z.string().min(1).default("text-embedding-3-small"),
  OPENAI_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60000),

  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  QDRANT_COLLECTION: z.string().min(1).default("docs_chunks"),
  QDRANT_BATCH_SIZE: z.coerce.number().int().min(1).max(1024).default(64),

  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  CHUNK_MAX_TOKENS: z.coerce.number().int().min(1).max(8192).default(450),
  CHUNK_OVERLAP_TOKENS: z.coerce.number().int().min(0).max(4096).default(80),
  MAX_CHUNKS_PER_DOC: z.coerce.number().int().min(1).max(500000).default(5000),

  TOP_K: z.coerce.number().int().min(1).max(100).default(8),
  MIN_SCORE: z.coerce.number().min(0).max(1).default(0.2),
  RE_RANK: booleanFromString.default(false),

  MAX_OUTPUT_TOKENS: z.coerce.number().int().min(1).max(8192).default(400),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60000),
  ANSWER_TEMPERATURE: z.coerce.number().min(0).max(2).default(0),

  AUDIT_STRICT_MODE: booleanFromString.default(true),
  AUDIT_FAIL_FAST: booleanFromString.default(false),

  WEBHOOK_URL: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  WEBHOOK_SECRET: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10000),

  CACHE_ENABLED: booleanFromString.default(true),
  CACHE_DIR: z.string().min(1).default("./tmp/cache"),
  CACHE_TTL_SECONDS: z.coerce.number().int().min(1).default(86400),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOG_JSON: booleanFromString.default(false),

  RATE_LIMIT_RPM: z.coerce.number().int().min(1).max(100000).default(60),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().int().min(1).max(1000).default(5),

  ENABLE_REFUSAL_GUARD: booleanFromString.default(true),
  ENABLE_CITATIONS: booleanFromString.default(true)
});

export type AppConfig = z.infer<typeof EnvSchema>;

export const appConfig: AppConfig = EnvSchema.parse(process.env);
