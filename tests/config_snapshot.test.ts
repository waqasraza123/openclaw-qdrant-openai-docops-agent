import { describe, expect, it, vi } from "vitest";

describe("buildConfigSnapshot", () => {
  it("redacts secrets and preserves public config fields", async () => {
    vi.resetModules();

    vi.doMock("../src/config/env.js", () => ({
      appConfig: {
        OPENAI_API_KEY: "sk-1234567890",
        OPENAI_MODEL: "gpt-4.1-mini",
        OPENAI_EMBED_MODEL: "text-embedding-3-small",
        OPENAI_MAX_RETRIES: 3,
        OPENAI_TIMEOUT_MS: 60000,
        QDRANT_URL: "https://qdrant.example",
        QDRANT_API_KEY: "qdrant-key-abcdef",
        QDRANT_COLLECTION: "docs_chunks",
        QDRANT_BATCH_SIZE: 64,
        SERVER_PORT: 3000,
        NODE_ENV: "development",
        CHUNK_MAX_TOKENS: 450,
        CHUNK_OVERLAP_TOKENS: 80,
        MAX_CHUNKS_PER_DOC: 5000,
        TOP_K: 8,
        MIN_SCORE: 0.2,
        RE_RANK: false,
        MAX_OUTPUT_TOKENS: 400,
        REQUEST_TIMEOUT_MS: 60000,
        ANSWER_TEMPERATURE: 0,
        AUDIT_STRICT_MODE: true,
        AUDIT_FAIL_FAST: false,
        WEBHOOK_URL: "",
        WEBHOOK_SECRET: "whsec_zzz",
        WEBHOOK_TIMEOUT_MS: 10000,
        CACHE_ENABLED: true,
        CACHE_DIR: "./tmp/cache",
        CACHE_TTL_SECONDS: 86400,
        LOG_LEVEL: "info",
        LOG_JSON: false,
        RATE_LIMIT_RPM: 60,
        MAX_CONCURRENT_REQUESTS: 5,
        ENABLE_REFUSAL_GUARD: true,
        ENABLE_CITATIONS: true
      }
    }));

    const moduleValue = await import("../src/maintenance/configSnapshot.js");
    const snapshot = moduleValue.buildConfigSnapshot();

    expect(snapshot.openai.model).toBe("gpt-4.1-mini");
    expect(snapshot.qdrant.url).toBe("https://qdrant.example");

    expect(snapshot.openai.api_key.is_set).toBe(true);
    expect(snapshot.openai.api_key.preview.includes("sk-")).toBe(true);
    expect(snapshot.openai.api_key.preview.includes("1234567890")).toBe(false);

    expect(snapshot.qdrant.api_key.is_set).toBe(true);
    expect(snapshot.qdrant.api_key.preview.includes("qdrant-key-abcdef")).toBe(false);

    expect(snapshot.webhooks.secret.is_set).toBe(true);
    expect(snapshot.webhooks.url_is_set).toBe(false);
  });
});
