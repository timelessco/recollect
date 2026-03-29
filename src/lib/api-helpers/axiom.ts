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
    deployment_id: process.env.VERCEL_DEPLOYMENT_ID ?? "local",
    environment: process.env.VERCEL_ENV ?? "development",
    region: process.env.VERCEL_REGION ?? "local",
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

    const context: ServerContext = {
      request_id: crypto.randomUUID(),
      source,
      // Set by withAuth after authentication
      user_id: null,
      fields: {},
    };

    const result = await runWithServerContext(context, async () => {
      try {
        const response = await innerHandler(request);
        const duration = performance.now() - start;
        const ctx = getServerContext();

        // onSuccess: log level based on HTTP status
        const { status } = response;
        const logData = {
          route,
          method: request.method,
          status,
          duration_ms: Math.round(duration),
          request_id: ctx?.request_id,
          source: ctx?.source,
          user_id: ctx?.user_id,
          search_params: Object.fromEntries(request.nextUrl.searchParams.entries()),
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
          route,
          method: request.method,
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
