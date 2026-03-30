/**
 * @module Build-time only
 *
 * Shared envelope wrapper for all API responses.
 * v1 endpoints return `{ data: T | null, error: string | null }`.
 * v2 endpoints return bare `T` on success and `{ error: string }` on failure.
 */
import { z } from "zod";

export function apiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    error: z.string().nullable(),
  });
}

/** Raw schema object for v2 error responses `{ error: string }`. */
export const v2ErrorResponseSchema = {
  properties: {
    error: { type: "string" as const },
  },
  required: ["error"],
  type: "object" as const,
};
