import { appConfig } from "../config/env.js";
import type { RetrievedSource } from "../retrieve/search.js";

const buildSourcesBlock = (sources: RetrievedSource[]) =>
  sources
    .map((s) => {
      const header = `${s.sourceId} chunk_id=${s.chunkId} source=${s.source} chunk_index=${s.chunkIndex} score=${s.score.toFixed(3)}`;
      return `${header}\n${s.text}`;
    })
    .join("\n\n");

export const buildGroundedAnswerInput = (params: { question: string; sources: RetrievedSource[] }) => {
  const sourcesBlock = buildSourcesBlock(params.sources);

  const systemInstruction =
    `You are a grounded assistant. You must only use the provided SOURCES.\n` +
    `If the SOURCES do not contain enough information, return a refusal.\n` +
    `You must output JSON.\n` +
    `If citations are enabled, the answer must include inline markers like [S1] [S2] where relevant.\n` +
    `Citations array must map each cited source_id to the correct chunk_id from SOURCES.\n` +
    `Do not invent sources, chunk ids, or facts.\n` +
    `Temperature is set by the caller.\n` +
    `Citations enabled: ${appConfig.ENABLE_CITATIONS ? "true" : "false"}.\n`;

  const userMessage =
    `QUESTION:\n${params.question}\n\n` +
    `SOURCES:\n${sourcesBlock}\n\n` +
    `Return JSON with keys: answer, citations, confidence, refusal_reason (optional).\n`;

  return [
    { role: "system" as const, content: systemInstruction },
    { role: "user" as const, content: userMessage }
  ];
};
