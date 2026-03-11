import { z } from "zod";

export const DocIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const ChunkIdSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/);

export const IngestRequestSchema = z.object({
  doc_id: DocIdSchema,
  pdf_path: z.string().min(1),
  replace: z.boolean().optional().default(false)
});

export const AskRequestSchema = z.object({
  doc_id: DocIdSchema,
  question: z.string().min(1)
});

export const AuditRunRequestSchema = z.object({
  doc_id: DocIdSchema,
  eval_set_path: z.string().min(1)
});

export const DocStatsRequestSchema = z.object({
  doc_id: DocIdSchema
});

export const DocDeleteRequestSchema = z.object({
  doc_id: DocIdSchema,
  confirm: z.string().min(1)
});

export const ChunkGetRequestSchema = z.object({
  doc_id: DocIdSchema,
  chunk_id: ChunkIdSchema
});

export type IngestRequest = z.infer<typeof IngestRequestSchema>;
export type AskRequest = z.infer<typeof AskRequestSchema>;
export type AuditRunRequest = z.infer<typeof AuditRunRequestSchema>;
export type DocStatsRequest = z.infer<typeof DocStatsRequestSchema>;
export type DocDeleteRequest = z.infer<typeof DocDeleteRequestSchema>;
export type ChunkGetRequest = z.infer<typeof ChunkGetRequestSchema>;
