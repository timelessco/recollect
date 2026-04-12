import ky from "ky";

import type { KyInstance } from "ky";

/**
 * Pre-configured ky instance for v2 API routes.
 * Callers use: api.get(V2_ROUTE_CONSTANT).json<T>()
 * URL constants are defined in src/utils/constants.ts (no leading slash — prefix handles it).
 * IMPORTANT: Do NOT use a leading slash on the path — "v2/foo", not "/v2/foo".
 * External APIs (untrusted responses): use ky directly with Standard Schema validation —
 * `ky(url).json(zodSchema)` — ky v2 validates natively via Zod 4's Standard Schema support.
 */
export const api: KyInstance = ky.create({ prefix: "/api" });
