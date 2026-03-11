import fs from "node:fs/promises";

import { z } from "zod";

export const EvalItemSchema = z.object({
  id: z.string().min(1),
  doc_id: z.string().min(1),
  question: z.string().min(1),
  must_include: z.array(z.string()).default([]),
  must_cite: z.boolean().default(true)
});

export type EvalItem = z.infer<typeof EvalItemSchema>;

export const EvalSetSchema = z.array(EvalItemSchema);

export const loadEvalSetFromFile = async (evalSetPath: string): Promise<EvalItem[]> => {
  const raw = await fs.readFile(evalSetPath, "utf8");
  const parsed = JSON.parse(raw);
  return EvalSetSchema.parse(parsed);
};
