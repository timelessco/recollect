import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/nextjs";

/**
 * Sentry payload scrubbing — strips auth tokens before events leave the worker.
 *
 * Three leak channels Sentry's defaults can carry:
 *   1. Header bags on event.request.headers and event.contexts[*].headers
 *   2. Breadcrumbs from the HTTP/fetch integration (Sentry auto-records
 *      request/response headers when sendDefaultPii is on)
 *   3. Exception messages that embed Bearer tokens (gaxios errors put
 *      Authorization headers in `cause.config.headers`, and stringified
 *      config sometimes ends up in error.message)
 *
 * Used by both src/sentry.server.config.ts and src/sentry.edge.config.ts so
 * the scrubbing logic stays in lockstep across runtimes.
 */

const SENSITIVE_HEADER_PATTERN = /^(?:authorization|x-goog-.*|cookie|set-cookie)$/i;

// Matches "Bearer <token>" with permissive token grammar (alphanum, dot, dash,
// underscore, slash, plus, equals — covers JWTs, opaque tokens, base64).
const BEARER_TOKEN_PATTERN = /Bearer\s+[\w.\-/+=]+/gi;

const isHeaderBag = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const scrubHeaders = (headers: Record<string, unknown>): Record<string, unknown> => {
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    scrubbed[key] = SENSITIVE_HEADER_PATTERN.test(key) ? "[redacted]" : value;
  }
  return scrubbed;
};

const scrubString = (value: string): string =>
  value.replace(BEARER_TOKEN_PATTERN, "Bearer [redacted]");

const scrubBreadcrumbData = (data: Record<string, unknown>): Record<string, unknown> => {
  const scrubbed: Record<string, unknown> = { ...data };
  for (const headerKey of ["request_headers", "response_headers", "headers"]) {
    const headers = scrubbed[headerKey];
    if (isHeaderBag(headers)) {
      scrubbed[headerKey] = scrubHeaders(headers);
    }
  }
  if (typeof scrubbed.url === "string") {
    scrubbed.url = scrubString(scrubbed.url);
  }
  return scrubbed;
};

/**
 * Scrub a breadcrumb before Sentry sends it. Use as the `beforeBreadcrumb`
 * hook in Sentry.init.
 */
export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb | null => {
  if (breadcrumb.data && isHeaderBag(breadcrumb.data)) {
    return {
      ...breadcrumb,
      data: scrubBreadcrumbData(breadcrumb.data),
      message:
        typeof breadcrumb.message === "string"
          ? scrubString(breadcrumb.message)
          : breadcrumb.message,
    };
  }
  if (typeof breadcrumb.message === "string") {
    return { ...breadcrumb, message: scrubString(breadcrumb.message) };
  }
  return breadcrumb;
};

/**
 * Scrub an event before Sentry sends it. Use as the `beforeSend` hook in
 * Sentry.init.
 *
 * Covers:
 *   - event.request.headers
 *   - event.contexts[*].headers and contexts[*].config.headers
 *   - event.breadcrumbs[*] (defense in depth — beforeBreadcrumb is the
 *     primary scrub but events still carry attached breadcrumbs)
 *   - event.exception.values[*].value (Bearer-token redaction in stringified
 *     errors)
 */
export const scrubEvent = (event: ErrorEvent, _hint?: EventHint): ErrorEvent => {
  if (isHeaderBag(event.request?.headers)) {
    Object.assign(event.request.headers, scrubHeaders(event.request.headers));
  }
  if (event.contexts) {
    for (const context of Object.values(event.contexts)) {
      if (!isHeaderBag(context)) {
        continue;
      }
      const headersField = context.headers;
      if (isHeaderBag(headersField)) {
        context.headers = scrubHeaders(headersField);
      }
      const configField = context.config;
      if (isHeaderBag(configField)) {
        const configHeadersField = configField.headers;
        if (isHeaderBag(configHeadersField)) {
          configField.headers = scrubHeaders(configHeadersField);
        }
      }
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map((b: Breadcrumb) => scrubBreadcrumb(b))
      .filter((b: Breadcrumb | null): b is Breadcrumb => b !== null);
  }
  if (event.exception?.values) {
    for (const value of event.exception.values) {
      if (typeof value.value === "string") {
        value.value = scrubString(value.value);
      }
    }
  }
  return event;
};
