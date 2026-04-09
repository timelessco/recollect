import { createProxyRouteHandler } from "@axiomhq/nextjs";

import { logger } from "@/lib/api-helpers/axiom";

/**
 * Proxy route for client-side Axiom log forwarding (AXIO-07).
 *
 * Receives LogEvent[] from browser's ProxyTransport, calls logger.raw(event)
 * per event then logger.flush(). Uses the SERVER Logger with AxiomJSTransport
 * + AXIOM_TOKEN — client never sees the token.
 *
 * This endpoint is intentionally unauthenticated — client telemetry must work
 * for all visitors including pre-auth. The endpoint only accepts valid LogEvent[]
 * payloads (createProxyRouteHandler validates the shape). Abuse risk is low:
 * Axiom's free tier has 500GB-1TB ingest, and the endpoint name is not guessable
 * from the public-facing app. If abuse becomes an issue, add Origin header
 * validation (check against NEXT_PUBLIC_SITE_URL).
 */
export const POST = createProxyRouteHandler(logger);
