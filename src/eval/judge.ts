import { appConfig } from "../config/env.js";
import type { AnswerOutput } from "../answer/schema.js";

export type AuditCaseResult = {
  id: string;
  doc_id: string;
  question: string;
  passed: boolean;
  reasons: string[];
  refused: boolean;
  citations_count: number;
  must_include: string[];
  must_cite: boolean;
  output: AnswerOutput;
  timings: { retrieval_ms: number; generation_ms: number };
};

const includesAllRequiredPhrases = (text: string, required: string[]) => {
  const normalized = text.toLowerCase();
  return required.every((phrase) => normalized.includes(phrase.toLowerCase()));
};

export const judgeAuditCase = (params: {
  evalItem: { id: string; doc_id: string; question: string; must_include: string[]; must_cite: boolean };
  output: AnswerOutput;
  timings: { retrieval_ms: number; generation_ms: number };
}): AuditCaseResult => {
  const reasons: string[] = [];
  const refused = typeof params.output.refusal_reason === "string" && params.output.refusal_reason.length > 0;

  if (params.evalItem.must_cite && appConfig.ENABLE_CITATIONS) {
    if (params.output.citations.length === 0 && !refused) {
      reasons.push("Expected citations but none were provided.");
    }
  }

  if (params.evalItem.must_include.length > 0 && !refused) {
    const ok = includesAllRequiredPhrases(params.output.answer, params.evalItem.must_include);
    if (!ok) reasons.push("Answer is missing required must_include phrases.");
  }

  if (appConfig.AUDIT_STRICT_MODE && refused && params.evalItem.must_include.length > 0) {
    reasons.push("Strict mode: refusal is not acceptable for this test case.");
  }

  const passed = reasons.length === 0;

  return {
    id: params.evalItem.id,
    doc_id: params.evalItem.doc_id,
    question: params.evalItem.question,
    passed,
    reasons,
    refused,
    citations_count: params.output.citations.length,
    must_include: params.evalItem.must_include,
    must_cite: params.evalItem.must_cite,
    output: params.output,
    timings: params.timings
  };
};
