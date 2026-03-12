import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildAskTraceArtifact,
  persistAskTraceArtifact,
  sanitizeTraceId
} from "../src/answer/traceArtifact.js";

describe("trace artifact", () => {
  it("sanitizes trace ids", () => {
    expect(sanitizeTraceId("a/b:c")).toBe("a_b_c");
    expect(sanitizeTraceId("ok-._123")).toBe("ok-._123");
  });

  it("persists artifact to disk", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "docops-trace-"));
    const artifact = buildAskTraceArtifact({
      trace: { request_id: "req/1", prompt_input: { x: 1 }, retrieved_sources: [] },
      docId: "d1",
      question: "q",
      createdAtIso: "t",
      model: "m",
      embedModel: "e",
      qdrantCollection: "c",
      output: { answer: "a" },
      sources: [],
      timings: { retrieval_ms: 1, generation_ms: 2 }
    });

    const filePath = await persistAskTraceArtifact({ artifact, directoryPath: tmpDir });
    const saved = JSON.parse(await fs.readFile(filePath, "utf8"));
    expect(saved.request_id).toBe("req/1");
    expect(saved.doc_id).toBe("d1");
  });
});
