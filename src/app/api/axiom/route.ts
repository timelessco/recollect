import { after } from "next/server";

import type { LogEvent } from "@axiomhq/logging";

import { logger } from "@/lib/api-helpers/axiom";

/**
 * Proxy route for client-side Axiom log forwarding.
 *
 * Receives LogEvent[] from the browser's ProxyTransport, enqueues each to the
 * SERVER Logger (AxiomJSTransport + AXIOM_TOKEN — client never sees the token),
 * and responds immediately. `after()` defers the network flush to `api.axiom.co`
 * until after the response is sent so the browser POST completes in milliseconds
 * and cannot queue behind a `<Link>` navigation's `/_next/data/...` fetch on the
 * dev server's single-process connection pool.
 *
 * This replaces the stock `createProxyRouteHandler(logger)` from `@axiomhq/nextjs`,
 * which awaits `logger.flush()` before responding. The body shape (LogEvent[]) is
 * stable and owned by `@axiomhq/logging`'s `SimpleFetchTransport`; if Axiom
 * changes the wire format we update this handler in place.
 *
 * This endpoint is intentionally unauthenticated — client telemetry must work
 * for all visitors including pre-auth. Abuse risk is low: Axiom's free tier has
 * 500GB-1TB ingest, and the endpoint name is not guessable from the public-facing
 * app. If abuse becomes an issue, add Origin header validation.
 *
 * Do NOT migrate this route to /api/v2/axiom — neither now nor in the future.
 * The v2 handler factory (withPublic/withAuth) is built around Zod schemas and
 * RecollectApiError, neither of which applies to Axiom's typed LogEvent shape.
 * There are no iOS or extension clients, so the v1/v2 deprecation story doesn't
 * apply — `/api/axiom` is the permanent URL.
 */
function isLogEventArray(value: unknown): value is LogEvent[] {
  return Array.isArray(value);
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (isLogEventArray(body)) {
      for (const event of body) {
        logger.raw(event);
      }
    }
    after(() => logger.flush());
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error(error);
    return Response.json({ status: "error" }, { status: 500 });
  }
}
