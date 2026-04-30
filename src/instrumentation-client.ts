import * as Sentry from "@sentry/nextjs";

import { env } from "@/env/client";

// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
Sentry.init({
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: env.NEXT_PUBLIC_LOCAL === "true",

  dsn: env.NEXT_PUBLIC_SENTRY_DSN,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // browserTracingIntegration starts a page-load trace and auto-attaches
  // `sentry-trace` + `baggage` headers to outgoing fetch/XHR calls matching
  // `tracePropagationTargets` (defaults to same-origin). This is the first
  // hop of the trace_id chain that lands in Axiom via the server handler.
  // eslint-disable-next-line import/namespace -- false positive: export exists in @sentry/nextjs types but oxlint can't resolve the re-export
  integrations: [Sentry.browserTracingIntegration()],
  // Note: if you want to override the automatic release value, do not set a
  // `release` value here - use the environment variable `SENTRY_RELEASE`, so
  // that it will also get attached to your source maps

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  tracesSampler: (samplingContext) => {
    if (samplingContext.parentSampled) {
      return 1;
    }

    // 20% base sampling for client-side traces
    return 0.2;
  },
});

// This export will instrument router navigations, and is only relevant if you enable tracing.
// `captureRouterTransitionStart` is available from SDK version 9.12.0 onwards
// eslint-disable-next-line import/namespace -- false positive: export exists in @sentry/nextjs types but oxlint can't resolve the re-export
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
