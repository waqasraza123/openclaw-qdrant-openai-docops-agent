import { appConfig } from "../src/config/env.js";
import { logger } from "../src/core/logger.js";
import { formatRetrievedSources } from "../src/retrieve/format.js";
import { retrieveSourcesForQuestion } from "../src/retrieve/search.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const parseOptionalNumber = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid number: " + value);
  return parsed;
};

const parseOptionalInt = (value: string | null) => {
  const parsed = parseOptionalNumber(value);
  if (parsed === null) return null;
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error("Invalid positive integer: " + String(value));
  return parsed;
};

const parseOptionalBoolean = (value: string | null) => {
  if (!value) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Invalid boolean: " + value);
};

const run = async () => {
  const args = process.argv.slice(2);

  const docId = getArgValue(args, "--doc-id");
  const question = getArgValue(args, "--q");
  const topKArg = getArgValue(args, "--top-k");
  const minScoreArg = getArgValue(args, "--min-score");
  const includeTextArg = getArgValue(args, "--include-text");

  if (!docId || !question) {
    throw new Error(
      "Usage: npm run retrieve -- --doc-id <id> --q <question> [--top-k N] [--min-score N] [--include-text true|false]"
    );
  }

  const topK = parseOptionalInt(topKArg) ?? appConfig.TOP_K;
  const minScore = parseOptionalNumber(minScoreArg) ?? appConfig.MIN_SCORE;
  const includeText = parseOptionalBoolean(includeTextArg) ?? false;

  const retrieved = await retrieveSourcesForQuestion({ docId, question, topK, minScore });
  const sources = formatRetrievedSources({ sources: retrieved.sources, includeText });

  process.stdout.write(
    JSON.stringify(
      {
        doc_id: docId,
        question,
        sources,
        timings: { retrieval_ms: retrieved.retrievalMs }
      },
      null,
      2
    ) + "\n"
  );
};

run().catch((error) => {
  logger.error({ err: error }, "Retrieve failed");
  process.exitCode = 1;
});
