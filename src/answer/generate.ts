import { zodTextFormat } from "openai/helpers/zod";

import { appConfig } from "../config/env.js";
import { openaiClient } from "../core/openai.js";
import { AnswerOutputSchema } from "./schema.js";

export const generateGroundedAnswer = async (input: Array<{ role: "system" | "user"; content: string }>) => {
  const maxOutputTokens = appConfig.MAX_OUTPUT_TOKENS;

  try {
    const structuredResponse = await openaiClient.responses.parse({
      model: appConfig.OPENAI_MODEL,
      input,
      temperature: appConfig.ANSWER_TEMPERATURE,
      max_output_tokens: maxOutputTokens,
      text: { format: zodTextFormat(AnswerOutputSchema, "docops_answer") }
    });

    const parsed = structuredResponse.output_parsed;
    return AnswerOutputSchema.parse(parsed);
  } catch {
    const jsonResponse = await openaiClient.responses.create({
      model: appConfig.OPENAI_MODEL,
      input,
      temperature: appConfig.ANSWER_TEMPERATURE,
      max_output_tokens: maxOutputTokens,
      text: { format: { type: "json_object" } }
    });

    const raw = jsonResponse.output_text;
    const parsed = AnswerOutputSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      throw new Error("Model output failed schema validation");
    }

    return parsed.data;
  }
};
