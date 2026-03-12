const setIfMissing = (key: string, value: string) => {
  const current = process.env[key];
  if (!current || current.trim().length === 0) process.env[key] = value;
};

setIfMissing("OPENAI_API_KEY", "test-openai-key");
setIfMissing("OPENAI_MODEL", "gpt-4.1-mini");
setIfMissing("OPENAI_EMBED_MODEL", "text-embedding-3-small");
setIfMissing("OPENAI_MAX_RETRIES", "1");
setIfMissing("OPENAI_TIMEOUT_MS", "60000");

setIfMissing("QDRANT_URL", "http://localhost:6333");
setIfMissing("QDRANT_API_KEY", "test-qdrant-key");
setIfMissing("QDRANT_COLLECTION", "docs_chunks");
setIfMissing("QDRANT_BATCH_SIZE", "64");

setIfMissing("SERVER_PORT", "3000");
setIfMissing("NODE_ENV", "test");

setIfMissing("CHUNK_MAX_TOKENS", "450");
setIfMissing("CHUNK_OVERLAP_TOKENS", "80");
setIfMissing("MAX_CHUNKS_PER_DOC", "5000");

setIfMissing("TOP_K", "8");
setIfMissing("MIN_SCORE", "0.2");
setIfMissing("RE_RANK", "false");

setIfMissing("MAX_OUTPUT_TOKENS", "400");
setIfMissing("REQUEST_TIMEOUT_MS", "60000");
setIfMissing("ANSWER_TEMPERATURE", "0");

setIfMissing("AUDIT_STRICT_MODE", "true");
setIfMissing("AUDIT_FAIL_FAST", "false");

setIfMissing("WEBHOOK_URL", "");
setIfMissing("WEBHOOK_SECRET", "test-webhook-secret");
setIfMissing("WEBHOOK_TIMEOUT_MS", "10000");

setIfMissing("CACHE_ENABLED", "true");
setIfMissing("CACHE_DIR", "./tmp/cache");
setIfMissing("CACHE_TTL_SECONDS", "86400");

setIfMissing("LOG_LEVEL", "info");
setIfMissing("LOG_JSON", "false");

setIfMissing("RATE_LIMIT_RPM", "60");
setIfMissing("MAX_CONCURRENT_REQUESTS", "5");

setIfMissing("ENABLE_REFUSAL_GUARD", "true");
setIfMissing("ENABLE_CITATIONS", "true");
