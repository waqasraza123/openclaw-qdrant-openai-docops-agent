import { appConfig } from "../config/env.js";

export type RedactedSecret = {
  is_set: boolean;
  preview: string;
};

export type ConfigSnapshot = {
  runtime: {
    node_env: string;
    server_port: number;
    log_level: string;
    log_json: boolean;
  };
  openai: {
    model: string;
    embed_model: string;
    max_retries: number;
    timeout_ms: number;
    api_key: RedactedSecret;
  };
  qdrant: {
    url: string;
    collection: string;
    batch_size: number;
    api_key: RedactedSecret;
  };
  chunking: {
    chunk_max_tokens: number;
    chunk_overlap_tokens: number;
    max_chunks_per_doc: number;
  };
  retrieval: {
    top_k: number;
    min_score: number;
    re_rank: boolean;
  };
  answering: {
    max_output_tokens: number;
    request_timeout_ms: number;
    temperature: number;
    enable_refusal_guard: boolean;
    enable_citations: boolean;
  };
  audit: {
    strict_mode: boolean;
    fail_fast: boolean;
  };
  webhooks: {
    url_is_set: boolean;
    timeout_ms: number;
    secret: RedactedSecret;
  };
  cache: {
    enabled: boolean;
    dir: string;
    ttl_seconds: number;
  };
  concurrency: {
    rate_limit_rpm: number;
    max_concurrent_requests: number;
  };
};

const buildRedactedSecret = (value: string | undefined): RedactedSecret => {
  if (!value || value.trim().length === 0) return { is_set: false, preview: "" };
  const trimmed = value.trim();
  const prefix = trimmed.slice(0, 3);
  const suffix = trimmed.slice(-2);
  const maskedMiddle = "*".repeat(Math.max(0, trimmed.length - (prefix.length + suffix.length)));
  return { is_set: true, preview: prefix + maskedMiddle + suffix };
};

export const buildConfigSnapshot = (): ConfigSnapshot => {
  return {
    runtime: {
      node_env: appConfig.NODE_ENV,
      server_port: appConfig.SERVER_PORT,
      log_level: appConfig.LOG_LEVEL,
      log_json: appConfig.LOG_JSON
    },
    openai: {
      model: appConfig.OPENAI_MODEL,
      embed_model: appConfig.OPENAI_EMBED_MODEL,
      max_retries: appConfig.OPENAI_MAX_RETRIES,
      timeout_ms: appConfig.OPENAI_TIMEOUT_MS,
      api_key: buildRedactedSecret(appConfig.OPENAI_API_KEY)
    },
    qdrant: {
      url: appConfig.QDRANT_URL,
      collection: appConfig.QDRANT_COLLECTION,
      batch_size: appConfig.QDRANT_BATCH_SIZE,
      api_key: buildRedactedSecret(appConfig.QDRANT_API_KEY)
    },
    chunking: {
      chunk_max_tokens: appConfig.CHUNK_MAX_TOKENS,
      chunk_overlap_tokens: appConfig.CHUNK_OVERLAP_TOKENS,
      max_chunks_per_doc: appConfig.MAX_CHUNKS_PER_DOC
    },
    retrieval: {
      top_k: appConfig.TOP_K,
      min_score: appConfig.MIN_SCORE,
      re_rank: appConfig.RE_RANK
    },
    answering: {
      max_output_tokens: appConfig.MAX_OUTPUT_TOKENS,
      request_timeout_ms: appConfig.REQUEST_TIMEOUT_MS,
      temperature: appConfig.ANSWER_TEMPERATURE,
      enable_refusal_guard: appConfig.ENABLE_REFUSAL_GUARD,
      enable_citations: appConfig.ENABLE_CITATIONS
    },
    audit: {
      strict_mode: appConfig.AUDIT_STRICT_MODE,
      fail_fast: appConfig.AUDIT_FAIL_FAST
    },
    webhooks: {
      url_is_set: Boolean(appConfig.WEBHOOK_URL && appConfig.WEBHOOK_URL.trim().length > 0),
      timeout_ms: appConfig.WEBHOOK_TIMEOUT_MS,
      secret: buildRedactedSecret(appConfig.WEBHOOK_SECRET)
    },
    cache: {
      enabled: appConfig.CACHE_ENABLED,
      dir: appConfig.CACHE_DIR,
      ttl_seconds: appConfig.CACHE_TTL_SECONDS
    },
    concurrency: {
      rate_limit_rpm: appConfig.RATE_LIMIT_RPM,
      max_concurrent_requests: appConfig.MAX_CONCURRENT_REQUESTS
    }
  };
};
