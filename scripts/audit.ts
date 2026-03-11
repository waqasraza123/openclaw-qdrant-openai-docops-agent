import path from "node:path";

import { logger } from "../src/core/logger.js";
import { emitWebhookEvent } from "../src/core/webhook.js";
import { answerQuestionWithGrounding } from "../src/answer/ask.js";
import { loadEvalSetFromFile } from "../src/eval/set.js";
import { judgeAuditCase } from "../src/eval/judge.js";
import { buildAuditReport, writeAuditReportFiles } from "../src/eval/report.js";

const getArgValue = (args: string[], flag: string) => {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  const value = args[index + 1];
  return typeof value === "string" && value.length > 0 ? value : null;
};

const run = async () => {
  const args = process.argv.slice(2);

  const docId = getArgValue(args, "--doc-id");
  const evalSetPath = getArgValue(args, "--set");

  if (!docId || !evalSetPath) {
    throw new Error("Usage: npm run audit -- --doc-id <id> --set <path>");
  }

  const resolvedSetPath = path.resolve(evalSetPath);
  const evalItems = await loadEvalSetFromFile(resolvedSetPath);

  const cases = [];

  for (const item of evalItems) {
    if (item.doc_id !== docId) continue;

    const result = await answerQuestionWithGrounding({ docId: item.doc_id, question: item.question });

    const judged = judgeAuditCase({
      evalItem: item,
      output: result.output,
      timings: result.timings
    });

    cases.push(judged);

    if (!judged.passed && item.must_include.length > 0) {
      if (process.env.AUDIT_FAIL_FAST === "true") break;
    }
  }

  const report = buildAuditReport(cases);
  const jsonPath = "tmp/audit-report.json";
  const mdPath = "tmp/audit-report.md";

  await writeAuditReportFiles({ report, jsonPath, mdPath });

  await emitWebhookEvent("audit.completed", {
    doc_id: docId,
    pass_rate: report.summary.pass_rate,
    refusal_rate: report.summary.refusal_rate,
    report_json_path: jsonPath,
    report_md_path: mdPath
  });

  process.stdout.write(JSON.stringify({ summary: report.summary, jsonPath, mdPath }, null, 2) + "\n");
};

run().catch((error) => {
  logger.error({ err: error }, "Audit failed");
  process.exitCode = 1;
});
