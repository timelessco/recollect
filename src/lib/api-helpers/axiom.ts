/**
 * Axiom route-handler telemetry wrapper. App Router only — uses
 * `after()` from `next/server`. Pages Router and other non-App
 * callers import `logger` from `./axiom-logger` instead.
 */

import { after } from "next/server";
import type { NextRequest, NextResponse } from "next/server";

import * as Sentry from "@sentry/nextjs";
import ensureError from "ensure-error";

import type { ServerContext, ServerFields } from "./server-context";

import { logger } from "./axiom-logger";
import { deriveSource, getServerContext, runWithServerContext } from "./server-context";

export { logger };

// ============================================================
// Logger Setup
// ============================================================

/**
 * Query parameter keys whose values are stripped from wide events before
 * emission. Credentials and short-lived auth tokens that could be replayed
 * by an attacker with Axiom read access during the credential's live window.
 * Presence is preserved — only the value becomes "<redacted>".
 */
const SENSITIVE_QUERY_KEYS = new Set([
  "access_token",
  "api_key",
  "code",
  "password",
  "refresh_token",
  "secret",
  "token",
  "token_hash",
]);

/**
 * Serialize query parameters to the OTel `url.query` scalar form
 * (URL-encoded `key=value&key=value`, no leading `?`), redacting
 * sensitive values. Single scalar replaces the prior nested object
 * emission that registered one Axiom field per unique query key.
 */
function serializeRedactedQuery(searchParams: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const [key, value] of searchParams) {
    out.append(key, SENSITIVE_QUERY_KEYS.has(key) ? "<redacted>" : value);
  }
  return out.toString();
}

/**
 * Extract the client IP per OTel `client.address`. Prefers the first
 * hop of `x-forwarded-for` (closest to the client), falls back to
 * `x-real-ip`. Returns undefined when no reliable address is available.
 */
function resolveClientAddress(headers: Headers): string | undefined {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headers.get("x-real-ip") ?? undefined;
}

interface ResolvedTraceContext {
  parentSpanId?: string;
  spanId: string;
  traceFlags?: 0 | 1;
  traceId: string;
}

/**
 * Resolve the request's trace context from Sentry's propagation scope.
 * Sentry parses the incoming `sentry-trace` / `baggage` / `traceparent`
 * headers and synthesizes a fresh trace when absent — reading from the
 * scope guarantees every Axiom wide event shares the same trace_id that
 * Sentry stamps on its own issues for this request.
 *
 * Fields map to the OTel Logs Data Model trace fields:
 * - `span_id` — Sentry's `propagationSpanId` (the server span id it uses
 *   on its own events); fresh random bytes as last resort. Never falls
 *   back to `parentSpanId` — that's the *upstream caller's* span, not
 *   ours, and would miscorrelate.
 * - `parent_span_id` — the incoming caller's span when present; omitted
 *   for root spans so `isnull(parent_span_id)` queries work in Axiom.
 * - `trace_flags` — W3C flags byte (1 = sampled, 0 = not); omitted when
 *   no sampling decision is attached to the propagation context.
 */
function resolveTraceContext(): ResolvedTraceContext {
  const { parentSpanId, propagationSpanId, sampled, traceId } =
    Sentry.getCurrentScope().getPropagationContext();
  const resolved: ResolvedTraceContext = {
    spanId: propagationSpanId ?? randomSpanId(),
    traceId,
  };
  if (parentSpanId) {
    resolved.parentSpanId = parentSpanId;
  }
  if (sampled !== undefined) {
    resolved.traceFlags = sampled ? 1 : 0;
  }
  return resolved;
}

function randomSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

// ============================================================
// Axiom Route Handler (outer telemetry layer)
// ============================================================

/** Minimal type for the inner handler produced by withAuth/withPublic */
type AxiomWrappableHandler = ((request: NextRequest) => Promise<NextResponse>) & {
  config: { route: string };
};

/**
 * Wide-event keys that stay top-level even though they'd otherwise match
 * the `_id` / `_ids` suffix rule. These are observability primitives —
 * filtered on across every dashboard, constant-cardinality, and part of
 * the OTel Logs Data Model trace context. Everything else ending in
 * `_id` / `_ids` collapses into the `ids` JSON scalar.
 */
const TOP_LEVEL_ID_KEYS = new Set([
  "parent_span_id",
  "request_id",
  "source",
  "span_id",
  "trace_flags",
  "trace_id",
  "user_id",
]);

/** Runtime guard for the `payload` branch — narrows value to a Record. */
function isPayloadRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Stringify a record into a single Axiom scalar, defensively. Drops keys whose
 * value is `undefined` first — `JSON.stringify({ k: undefined })` would otherwise
 * emit `"{}"`, masquerading as a real payload — and returns `undefined` when
 * nothing meaningful is left. Wraps `JSON.stringify` in try/catch because BigInt
 * and circular references throw, and a thrown serializer in the error path
 * (line ~299) would swallow the original request error before it ever reaches
 * Axiom or Sentry.
 */
function toJsonScalar(record: Record<string, unknown>): string | undefined {
  const scalarInput = Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(scalarInput).length === 0) {
    return undefined;
  }
  try {
    const scalar = JSON.stringify(scalarInput);
    return scalar === "{}" ? undefined : scalar;
  } catch {
    return undefined;
  }
}

/**
 * Partition handler-written `ctx.fields` into top-level keys, a single
 * JSON-stringified `ids` scalar, and a single JSON-stringified `payload`
 * scalar. Collapsing domain keys into scalars stops them from registering
 * as top-level Axiom fields — the dataset has a 256-field ceiling and
 * unbounded per-handler keys were consuming slots as the route surface
 * grew. Analysts filter via `parse_json(fields["ids"]).<key>` and
 * `parse_json(fields["payload"]).<key>` (same pattern as `error_context`,
 * `search_params`).
 *
 * Rules (in evaluation order):
 * - `payload` → single JSON scalar when the value is a non-empty object;
 *   dropped entirely when absent / nullish / empty. Non-object values
 *   fall through to top-level (unreachable under the typed API after the
 *   guardrail lands, but the partitioner stays defensive).
 * - Allowlisted observability primitives → top-level.
 * - Any other key ending in `_id` / `_ids` → `ids` scalar.
 * - Everything else → top-level.
 * - `ids` and `payload` are emitted only when at least one key was present.
 */
function partitionFields(fields: ServerFields): {
  idsScalar: string | undefined;
  payloadScalar: string | undefined;
  topLevel: Record<string, unknown>;
} {
  const topLevel: Record<string, unknown> = {};
  const ids: Record<string, unknown> = {};
  let payloadScalar: string | undefined;
  for (const [key, value] of Object.entries(fields)) {
    if (key === "payload") {
      if (isPayloadRecord(value)) {
        payloadScalar = toJsonScalar(value);
        continue;
      }
      if (value !== undefined && value !== null) {
        topLevel[key] = value;
      }
      continue;
    }
    if (TOP_LEVEL_ID_KEYS.has(key)) {
      topLevel[key] = value;
      continue;
    }
    if (key.endsWith("_id") || key.endsWith("_ids")) {
      ids[key] = value;
      continue;
    }
    topLevel[key] = value;
  }
  const idsScalar = toJsonScalar(ids);
  return { idsScalar, payloadScalar, topLevel };
}

/**
 * Outer telemetry layer.
 * Wraps the inner handler with:
 * - AsyncLocalStorage context (request_id, source)
 * - Request timing
 * - onSuccess logging (status → log level mapping)
 * - onError logging (structured error) + re-throw for onRequestError → Sentry
 *
 * onSuccess captures status, timing, searchParams
 * onError captures structured error context
 * Unknown errors logged here AND re-thrown to reach onRequestError
 * Zero Sentry.captureException in this code
 */
export function createAxiomRouteHandler(
  innerHandler: AxiomWrappableHandler,
): AxiomWrappableHandler {
  const { route } = innerHandler.config;

  const handler = async (request: NextRequest): Promise<NextResponse> => {
    const start = performance.now();
    const authHeader = request.headers.get("authorization");
    // process.env used intentionally — server secret, consistent with supabase/constants.ts pattern
    const source = deriveSource(authHeader, process.env.SUPABASE_SERVICE_KEY);

    // Read the request's trace context from Sentry's propagation scope.
    // Sentry owns the parsing (sentry-trace / baggage / traceparent) and
    // the fresh-trace fallback, so Axiom's trace_id always matches the
    // trace_id Sentry stamps on issues for this same request.
    const traceContext = resolveTraceContext();

    const context: ServerContext = {
      request_id: crypto.randomUUID(),
      source,
      // Set by withAuth after authentication
      user_id: null,
      fields: {
        span_id: traceContext.spanId,
        trace_id: traceContext.traceId,
        ...(traceContext.parentSpanId ? { parent_span_id: traceContext.parentSpanId } : {}),
        ...(traceContext.traceFlags !== undefined ? { trace_flags: traceContext.traceFlags } : {}),
      },
    };

    const result = await runWithServerContext(context, async () => {
      // Shared OTel HTTP semconv v1.40 attributes emitted on both success and error paths.
      // https://opentelemetry.io/docs/specs/semconv/http/http-spans/
      const urlQuery = serializeRedactedQuery(request.nextUrl.searchParams);
      const otelAttrs = {
        "http.request.method": request.method,
        "http.route": route,
        "url.path": request.nextUrl.pathname,
        ...(urlQuery ? { "url.query": urlQuery } : {}),
        "client.address": resolveClientAddress(request.headers),
        "user_agent.original": request.headers.get("user-agent") ?? undefined,
      };

      try {
        const response = await innerHandler(request);
        const duration = performance.now() - start;
        const ctx = getServerContext();

        // onSuccess: log level based on HTTP status
        const { status } = response;
        const { idsScalar, payloadScalar, topLevel } = partitionFields(ctx?.fields ?? {});
        const logData = {
          ...otelAttrs,
          "http.response.status_code": status,
          duration_ms: Math.round(duration),
          request_id: ctx?.request_id,
          source: ctx?.source,
          user_id: ctx?.user_id,
          ...topLevel,
          ...(idsScalar ? { ids: idsScalar } : {}),
          ...(payloadScalar ? { payload: payloadScalar } : {}),
        };

        if (status >= 500) {
          logger.error("Request failed", logData);
        } else if (status >= 400) {
          logger.warn("Request warning", logData);
        } else {
          logger.info("Request completed", logData);
        }

        after(() => logger.flush());

        return response;
      } catch (error) {
        const duration = performance.now() - start;
        const ctx = getServerContext();
        const err = ensureError(error);

        const { idsScalar, payloadScalar, topLevel } = partitionFields(ctx?.fields ?? {});
        // onError: structured error logging to Axiom
        logger.error("Request error", {
          ...otelAttrs,
          duration_ms: Math.round(duration),
          request_id: ctx?.request_id,
          source: ctx?.source,
          user_id: ctx?.user_id,
          ...topLevel,
          ...(idsScalar ? { ids: idsScalar } : {}),
          ...(payloadScalar ? { payload: payloadScalar } : {}),
          error_name: err.name,
          error_message: err.message,
          error_stack: err.stack,
        });

        after(() => logger.flush());

        // Re-throw so error reaches Next.js → onRequestError → Sentry
        throw error;
      }
    });
    return result;
  };

  // Preserve .config for OpenAPI scanner discovery
  return Object.assign(handler, { config: innerHandler.config });
}
