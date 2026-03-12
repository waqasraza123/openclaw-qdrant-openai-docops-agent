import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { answerQuestionWithGrounding } from "../src/answer/ask.js";
import {
  buildAskTraceArtifact,
  getDefaultTraceDirectory,
  persistAskTraceArtifact
} from "../src/answer/traceArtifact.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const run = async () => {
  const args = process.argv.slice(2);

  const docId = getArgValue(args, "--doc-id");
  const question = getArgValue(args, "--q");
  const traceOut = getArgValue(args, "--trace-out");

  if (!docId || !question) {
    throw new Error("Usage: npm run ask:trace -- --doc-id <id> --q <question> [--trace-out <dir>]");
  }

  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const result = await answerQuestionWithGrounding({ docId, question, requestId, includeTrace: true });

  if (!result.trace) {
    throw new Error("Trace was requested but not returned by the ask pipeline");
  }

  const createdAtIso = new Date().toISOString();
  const artifact = buildAskTraceArtifact({
    trace: result.trace,
    docId,
    question,
    createdAtIso,
    model: appConfig.OPENAI_MODEL,
    embedModel: appConfig.OPENAI_EMBED_MODEL,
    qdrantCollection: appConfig.QDRANT_COLLECTION,
    output: result.output,
    sources: result.sources,
    timings: result.timings
  });

  const directoryPath = traceOut ? traceOut : getDefaultTraceDirectory(appConfig.CACHE_DIR);
  const tracePath = await persistAskTraceArtifact({ artifact, directoryPath });

  process.stdout.write(
    JSON.stringify(
      {
        doc_id: docId,
        output: result.output,
        sources: result.sources,
        timings: result.timings,
        trace_path: tracePath
      },
      null,
      2
    ) + "\n"
  );
};

run().catch((error) => {
  logger.error({ err: error }, "Ask trace failed");
  process.exitCode = 1;
});
