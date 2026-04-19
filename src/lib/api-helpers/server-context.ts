/**
 * AsyncLocalStorage-based request context for per-request tracing.
 *
 * Provides request_id, source classification, and user_id that flow
 * through the entire request lifecycle without prop drilling.
 * Used by the Axiom logger and Sentry breadcrumbs in the v2 factory.
 */

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Observability primitives the factory emits as top-level Axiom columns.
 * Allowlisted because they power dashboards, constant-cardinality filters,
 * and the OTel Logs Data Model trace context. Other writes must route
 * through `payload` to avoid registering new dataset columns.
 */
interface ObservabilityFields {
  parent_span_id?: string;
  request_id?: string;
  source?: ServerContext["source"];
  span_id?: string;
  trace_flags?: 0 | 1;
  trace_id?: string;
  user_id?: string;
}

/**
 * Domain entity IDs. The factory auto-collapses keys matching this index
 * signature into the `ids` JSON scalar. Matching shape — any `<entity>_id`
 * or `<entity>_ids` — is accepted so handlers can keep naming fields
 * naturally.
 */
type IdSuffixFields = Partial<Record<`${string}_id` | `${string}_ids`, unknown>>;

/**
 * Single escape hatch for non-observability, non-entity-id context. The
 * factory JSON-stringifies this into the `fields.payload` scalar so
 * per-handler domain keys don't consume top-level Axiom columns.
 */
interface PayloadField {
  payload?: Record<string, unknown>;
}

export type ServerFields = IdSuffixFields & ObservabilityFields & PayloadField;

export interface ServerContext {
  /**
   * Handler-contributed business context for wide events (populated during
   * request). Narrowed to refuse hand-written non-observability, non-id
   * top-level writes at compile time — use `setPayload` for anything else.
   */
  fields?: ServerFields;
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
