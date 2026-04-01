import ky from "ky";

import type { KyInstance } from "ky";
import type { z } from "zod";

/**
 * Pre-configured ky instance for v2 API routes.
 * Callers use: api.get(V2_ROUTE_CONSTANT).json<T>()
 * URL constants are defined in src/utils/constants.ts (no leading slash — prefixUrl handles it).
 * IMPORTANT: Do NOT use a leading slash on the path — "v2/foo", not "/v2/foo".
 */
export const api: KyInstance = ky.create({ prefixUrl: "/api" });

/**
 * Fetch from an external API with runtime Zod validation.
 * For internal v2 routes, use the `api` instance instead — server validates.
 */
export async function fetchWithSchema<T extends z.ZodType>(
  url: string,
  schema: T,
): Promise<z.infer<T>> {
  const data: unknown = await ky(url).json();
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    throw new Error(`External API validation failed: ${JSON.stringify(parsed.error.issues)}`);
  }

  return parsed.data;
}
