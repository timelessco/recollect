// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { env } from "@/env/client";

Sentry.init({
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  dsn: env.NEXT_PUBLIC_SENTRY_DSN,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  tracesSampler: (samplingContext) => {
    // Always trace if parent transaction was sampled (distributed tracing)
    if (samplingContext.parentSampled) {
      return 1;
    }

    const name = samplingContext.name ?? "";

    // Zero sampling for cron/scheduled routes (high volume, low value)
    if (name.includes("/api/cron/") || name.includes("healthcheck")) {
      return 0;
    }

    // 20% base sampling for all other routes
    return 0.2;
  },
});
