/**
 * AsyncLocalStorage-based request context for per-request tracing.
 *
 * Provides request_id, source classification, and user_id that flow
 * through the entire request lifecycle without prop drilling.
 * Used by the Axiom logger and Sentry breadcrumbs in the v2 factory.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface ServerContext {
  /** Handler-contributed business context for wide events (populated during request) */
  fields?: Record<string, unknown>;
  /** Always set — generated UUID per request */
  request_id: string;
  /**
   * Derived from auth method:
   * - No authorization header → "web" (browsers, anonymous)
   * - Bearer user JWT → "ios" (mobile share extension)
   * - Bearer matching SUPABASE_SERVICE_KEY → "edge-function"
   */
  source: "edge-function" | "ios" | "web";
  /** Set after auth resolves — null for public/pre-auth routes */
  user_id: string | null;
}

const asyncLocalStorage = new AsyncLocalStorage<ServerContext>();

/**
 * Run a callback within a server context.
 * Called at factory entry (createAxiomRouteHandler) before auth.
 */
export function runWithServerContext<T>(
  context: ServerContext,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Get the current request context. Returns undefined outside of
 * runWithServerContext — callers must handle the undefined case.
 */
export function getServerContext(): ServerContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Merge entries into `ctx.fields.payload` — the single JSON scalar the
 * factory collapses non-observability, non-entity-id wide-event keys into.
 * Callers write domain data via this helper so no handler has to spread
 * `ctx.fields.payload` itself (typed `unknown` until the guardrail narrows
 * it, which would otherwise fail TS2698). No-op when `ctx` or `ctx.fields`
 * is absent (routes outside the v2 factory).
 */
export function setPayload(ctx: ServerContext | undefined, entries: Record<string, unknown>): void {
  if (!ctx?.fields) {
    return;
  }
  const prev = ctx.fields.payload;
  const base = typeof prev === "object" && prev !== null && !Array.isArray(prev) ? prev : {};
  ctx.fields.payload = { ...base, ...entries };
}

/**
 * Derive source from the authorization header value.
 * Must be called at factory entry before auth resolution.
 *
 * Logic:
 * - No header → "web"
 * - Header matches SUPABASE_SERVICE_KEY → "edge-function"
 * - Any other bearer token → "ios"
 */
export function deriveSource(
  authorizationHeader: string | null,
  supabaseServiceKey: string | undefined,
): ServerContext["source"] {
  if (!authorizationHeader) {
    return "web";
  }

  const token = authorizationHeader.replace("Bearer ", "");

  if (supabaseServiceKey && token === supabaseServiceKey) {
    return "edge-function";
  }

  return "ios";
}
