import { describe, expect, it } from "vitest";

import { runDiagnostics } from "../src/maintenance/diagnostics.js";

describe("runDiagnostics", () => {
  it("returns ok true when qdrant and embeddings succeed", async () => {
    const diagnostics = await runDiagnostics({
      startedAtIso: "t0",
      nowIso: () => "t1",
      measureMs: async <T>(operation: () => Promise<T>) => {
        const result = await operation();
        return { result, elapsedMs: 7 };
      },
      getQdrantCollections: async () => ({ collections: [{ name: "a" }, { name: "b" }] }),
      createEmbeddings: async () => ({ vectors: [[0.1, 0.2, 0.3]] }),
      embedModel: "text-embedding-3-small",
      probeText: "ping",
      includeOpenAi: true
    });

    expect(diagnostics.ok).toBe(true);
    expect(diagnostics.qdrant.ok).toBe(true);
    expect(diagnostics.qdrant.collections).toEqual(["a", "b"]);
    expect(diagnostics.openai_embeddings.included).toBe(true);
    expect(diagnostics.openai_embeddings.ok).toBe(true);
    expect(diagnostics.openai_embeddings.vector_size).toBe(3);
  });

  it("skips openai when includeOpenAi is false", async () => {
    const diagnostics = await runDiagnostics({
      startedAtIso: "t0",
      nowIso: () => "t1",
      measureMs: async <T>(operation: () => Promise<T>) => {
        const result = await operation();
        return { result, elapsedMs: 2 };
      },
      getQdrantCollections: async () => ({ collections: [{ name: "a" }] }),
      createEmbeddings: async () => {
        throw new Error("should not be called");
      },
      embedModel: "text-embedding-3-small",
      probeText: "ping",
      includeOpenAi: false
    });

    expect(diagnostics.ok).toBe(true);
    expect(diagnostics.openai_embeddings.included).toBe(false);
    expect(diagnostics.openai_embeddings.ok).toBe(true);
  });

  it("returns ok false and errors when included dependencies fail", async () => {
    const diagnostics = await runDiagnostics({
      startedAtIso: "t0",
      nowIso: () => "t1",
      measureMs: async <T>(operation: () => Promise<T>) => {
        const result = await operation();
        return { result, elapsedMs: 3 };
      },
      getQdrantCollections: async () => {
        throw new Error("qdrant down");
      },
      createEmbeddings: async () => {
        throw new Error("openai down");
      },
      embedModel: "text-embedding-3-small",
      probeText: "ping",
      includeOpenAi: true
    });

    expect(diagnostics.ok).toBe(false);
    expect(diagnostics.qdrant.ok).toBe(false);
    expect(diagnostics.qdrant.error).toBe("qdrant down");
    expect(diagnostics.openai_embeddings.included).toBe(true);
    expect(diagnostics.openai_embeddings.ok).toBe(false);
    expect(diagnostics.openai_embeddings.error).toBe("openai down");
  });
});
