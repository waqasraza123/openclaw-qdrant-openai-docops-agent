import fs from "node:fs/promises";

import type { AuditCaseResult } from "./judge.js";

export type AuditReport = {
  summary: {
    total: number;
    passed: number;
    failed: number;
    pass_rate: number;
    refusal_rate: number;
    avg_retrieval_ms: number;
    avg_generation_ms: number;
  };
  cases: AuditCaseResult[];
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const buildAuditReport = (cases: AuditCaseResult[]): AuditReport => {
  const total = cases.length;
  const passed = cases.filter((c) => c.passed).length;
  const failed = total - passed;
  const pass_rate = total === 0 ? 0 : passed / total;
  const refusal_rate = total === 0 ? 0 : cases.filter((c) => c.refused).length / total;

  const avg_retrieval_ms = average(cases.map((c) => c.timings.retrieval_ms));
  const avg_generation_ms = average(cases.map((c) => c.timings.generation_ms));

  return {
    summary: {
      total,
      passed,
      failed,
      pass_rate,
      refusal_rate,
      avg_retrieval_ms,
      avg_generation_ms
    },
    cases
  };
};

export const writeAuditReportFiles = async (params: {
  report: AuditReport;
  jsonPath: string;
  mdPath: string;
}) => {
  await fs.mkdir("tmp", { recursive: true });
  await fs.writeFile(params.jsonPath, JSON.stringify(params.report, null, 2), "utf8");

  const failedCases = params.report.cases.filter((c) => !c.passed);

  const md =
    `# Audit Report\n\n` +
    `## Summary\n\n` +
    `- Total: ${params.report.summary.total}\n` +
    `- Passed: ${params.report.summary.passed}\n` +
    `- Failed: ${params.report.summary.failed}\n` +
    `- Pass rate: ${(params.report.summary.pass_rate * 100).toFixed(1)}%\n` +
    `- Refusal rate: ${(params.report.summary.refusal_rate * 100).toFixed(1)}%\n` +
    `- Avg retrieval ms: ${params.report.summary.avg_retrieval_ms.toFixed(1)}\n` +
    `- Avg generation ms: ${params.report.summary.avg_generation_ms.toFixed(1)}\n\n` +
    `## Failures\n\n` +
    (failedCases.length === 0
      ? `No failures.\n`
      : failedCases
          .map(
            (c) =>
              `### ${c.id}\n\n` +
              `Question: ${c.question}\n\n` +
              `Reasons:\n` +
              c.reasons.map((r) => `- ${r}`).join("\n") +
              `\n\nRepro:\n` +
              `npm run ask -- --doc-id ${c.doc_id} --q "${c.question.replaceAll('"', '\\"')}"\n`
          )
          .join("\n"));

  await fs.writeFile(params.mdPath, md, "utf8");
};
