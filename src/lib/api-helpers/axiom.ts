/**
 * Axiom structured logging and route handler telemetry wrapper.
 *
 * Logger: dual transport (AxiomJS + Console) — graceful when AXIOM_TOKEN missing.
 * createAxiomRouteHandler: outer telemetry layer wrapping withAuth/withPublic handlers.
 */

import { after } from "next/server";
import type { NextRequest, NextResponse } from "next/server";

import { Axiom } from "@axiomhq/js";
import { AxiomJSTransport, ConsoleTransport, Logger } from "@axiomhq/logging";
import ensureError from "ensure-error";

import type { ServerContext } from "./server-context";

import { env } from "@/env/server";

import { deriveSource, getServerContext, runWithServerContext } from "./server-context";

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

// W3C Trace Context v00: `00-{32 hex trace_id}-{16 hex span_id}-{2 hex flags}`.
// https://www.w3.org/TR/trace-context/#traceparent-header
const TRACEPARENT_V00 = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;
const ZERO_TRACE_ID = "0".repeat(32);
const ZERO_SPAN_ID = "0".repeat(16);

interface TraceContext {
  spanId: string;
  traceId: string;
}

/**
 * Parse a W3C `traceparent` header. Strict about version `00` and length
 * 55 — unknown versions and malformed inputs return null so the caller
 * restarts the trace. All-zero trace_id or span_id is explicitly invalid
 * per W3C § 3.2.2.3 and also triggers restart.
 */
function parseTraceparent(header: string | null): TraceContext | null {
  if (!header) {
    return null;
  }
  const match = TRACEPARENT_V00.exec(header);
  if (!match) {
    return null;
  }
  const [, traceId, spanId] = match;
  if (!traceId || !spanId || traceId === ZERO_TRACE_ID || spanId === ZERO_SPAN_ID) {
    return null;
  }
  return { traceId, spanId };
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Generate a fresh W3C-compliant trace context: 16-byte trace_id and
 * 8-byte span_id as lowercase hex. Used when the incoming request has no
 * (valid) `traceparent` header. Fresh crypto-random bytes — intentionally
 * not derived from `request_id`, which is a UUID with different lifetime
 * and encoding semantics.
 */
function synthesizeTraceContext(): TraceContext {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return {
    traceId: toHex(bytes.subarray(0, 16)),
    spanId: toHex(bytes.subarray(16, 24)),
  };
}

const baseTransport = new ConsoleTransport({
  prettyPrint: env.NODE_ENV === "development",
});

const extraTransports: AxiomJSTransport[] = [];

// Only add Axiom transport when token is configured (graceful local dev)
if (env.AXIOM_TOKEN) {
  const axiomClient = new Axiom({
    token: env.AXIOM_TOKEN,
  });

  extraTransports.push(
    new AxiomJSTransport({
      axiom: axiomClient,
      dataset: env.AXIOM_DATASET,
    }),
  );
}

function resolveBaseUrl(): string {
  if (process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return "http://localhost:3000";
}

export const logger = new Logger({
  transports: [baseTransport, ...extraTransports],
  // process.env used intentionally — Vercel system vars, not in @t3-oss/env-nextjs
  // (auto-injected by Vercel, absent in local dev — graceful fallback)
  args: {
    base_url: resolveBaseUrl(),
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  },
});

// ============================================================
// Axiom Route Handler (outer telemetry layer)
// ============================================================

/** Minimal type for the inner handler produced by withAuth/withPublic */
type AxiomWrappableHandler = ((request: NextRequest) => Promise<NextResponse>) & {
  config: { route: string };
};

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

    // Propagate W3C trace context so every Axiom wide event carries
    // trace_id + span_id — the join key with Sentry issues (Sentry's
    // OTel propagator reads the same header automatically).
    const traceContext =
      parseTraceparent(request.headers.get("traceparent")) ?? synthesizeTraceContext();

    const context: ServerContext = {
      request_id: crypto.randomUUID(),
      source,
      // Set by withAuth after authentication
      user_id: null,
      fields: {
        trace_id: traceContext.traceId,
        span_id: traceContext.spanId,
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
        const logData = {
          ...otelAttrs,
          "http.response.status_code": status,
          duration_ms: Math.round(duration),
          request_id: ctx?.request_id,
          source: ctx?.source,
          user_id: ctx?.user_id,
          ...ctx?.fields,
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

        // onError: structured error logging to Axiom (AXIO-04)
        logger.error("Request error", {
          ...otelAttrs,
          duration_ms: Math.round(duration),
          request_id: ctx?.request_id,
          source: ctx?.source,
          user_id: ctx?.user_id,
          ...ctx?.fields,
          error_name: err.name,
          error_message: err.message,
          error_stack: err.stack,
        });

        after(() => logger.flush());

        // Re-throw so error reaches Next.js → onRequestError → Sentry (FACT-04)
        throw error;
      }
    });
    return result;
  };

  // Preserve .config for OpenAPI scanner discovery
  return Object.assign(handler, { config: innerHandler.config });
}
