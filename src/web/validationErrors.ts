import { ZodError } from "zod";

export type ValidationErrorResponse = {
  statusCode: 400;
  payload: {
    error: string;
    issues: Array<{ path: string; message: string }>;
  };
};

export const formatZodValidationError = (error: unknown): ValidationErrorResponse | null => {
  if (!(error instanceof ZodError)) return null;

  const issues = error.issues.map((issue) => ({
    path: issue.path.map((p) => String(p)).join("."),
    message: issue.message
  }));

  return { statusCode: 400, payload: { error: "Validation failed", issues } };
};
