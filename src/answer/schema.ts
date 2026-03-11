import { z } from "zod";

export const AnswerOutputSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ source_id: z.string(), chunk_id: z.string() })),
  confidence: z.enum(["low", "medium", "high"]),
  refusal_reason: z.string().optional()
});

export type AnswerOutput = z.infer<typeof AnswerOutputSchema>;
