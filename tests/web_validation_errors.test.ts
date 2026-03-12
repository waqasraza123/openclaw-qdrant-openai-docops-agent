import { describe, expect, it } from "vitest";

import { IngestRequestSchema } from "../src/web/schemas.js";
import { formatZodValidationError } from "../src/web/validationErrors.js";

describe("formatZodValidationError", () => {
  it("formats zod parse failures into 400 response payload", () => {
    try {
      IngestRequestSchema.parse({});
      expect(false).toBe(true);
    } catch (error) {
      const formatted = formatZodValidationError(error);
      expect(formatted?.statusCode).toBe(400);
      expect(formatted?.payload.error).toBe("Validation failed");
      expect((formatted?.payload.issues ?? []).length).toBeGreaterThan(0);
    }
  });

  it("returns null for non-zod errors", () => {
    const formatted = formatZodValidationError(new Error("x"));
    expect(formatted).toBeNull();
  });
});
