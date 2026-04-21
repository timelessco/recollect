import { createProxyRouteHandler } from "@axiomhq/nextjs";

import { logger } from "@/lib/api-helpers/axiom";

/**
 * Proxy route for client-side Axiom log forwarding.
 *
 * Receives LogEvent[] from the browser's ProxyTransport, calls logger.raw(event)
 * per event then logger.flush(). Uses the SERVER Logger with AxiomJSTransport
 * + AXIOM_TOKEN — client never sees the token.
 *
 * This endpoint is intentionally unauthenticated — client telemetry must work
 * for all visitors including pre-auth. The endpoint only accepts valid LogEvent[]
 * payloads (createProxyRouteHandler validates the shape). Abuse risk is low:
 * Axiom's free tier has 500GB-1TB ingest, and the endpoint name is not guessable
 * from the public-facing app. If abuse becomes an issue, add Origin header
 * validation (check against NEXT_PUBLIC_SITE_URL).
 *
 * Do NOT migrate this route to /api/v2/axiom — neither now nor in the future.
 *
 * Reasons:
 *   - The handler is `createProxyRouteHandler(logger)` from `@axiomhq/nextjs`.
 *     Its request/response contract is owned by Axiom's SDK, not by us. There
 *     is no Zod input/output schema to author against, and no meaningful
 *     `RecollectApiError` surface — the SDK parses LogEvent[] internally and
 *     returns its own acknowledgements. Wrapping it in the v2 handler factory
 *     (withPublic/withAuth) would bypass or conflict with that contract.
 *   - The client caller is `@axiomhq/logging`'s `ProxyTransport` (a
 *     `SimpleFetchTransport` subclass owning batching, autoFlush, and retry).
 *     It is NOT a typed hook that would benefit from `api.post(...).json<T>()`.
 *     Replacing the transport with ky would dismantle Axiom's delivery
 *     guarantees for marginal uniformity.
 *   - There are no iOS or extension clients of this route, so the v1/v2
 *     deprecation story does not apply — `/api/axiom` is the permanent URL.
 *
 * If Axiom ships a breaking change to `createProxyRouteHandler`, update in
 * place here; do not introduce a v2 twin.
 */
export const POST = createProxyRouteHandler(logger);
