import { logger } from "../src/core/logger.js";
import { answerQuestionWithGrounding } from "../src/answer/ask.js";

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

  if (!docId || !question) {
    throw new Error('Usage: npm run ask -- --doc-id <id> --q "question"');
  }

  const result = await answerQuestionWithGrounding({ docId, question });

  process.stdout.write(
    JSON.stringify(
      {
        doc_id: docId,
        output: result.output,
        sources: result.sources,
        timings: result.timings
      },
      null,
      2
    ) + "\n"
  );
};

run().catch((error) => {
  logger.error({ err: error }, "Ask failed");
  process.exitCode = 1;
});
