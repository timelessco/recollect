/**
 * @module Build-time only
 *
 * Shared envelope wrapper for all API responses.
 * Every endpoint returns `{ data: T | null, error: string | null }`.
 */
import { z } from "zod";

export function apiResponseSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    error: z.string().nullable(),
  });
}
