// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { env } from "@/env/client";
import { scrubBreadcrumb, scrubEvent } from "@/lib/sentry/scrub";

Sentry.init({
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  dsn: env.NEXT_PUBLIC_SENTRY_DSN,

  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Edge functions carry the same auth-token leak surfaces as server
  // functions — apply the same scrubbing across runtimes.
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSend: scrubEvent,

  tracesSampler: (samplingContext) => {
    if (samplingContext.parentSampled) {
      return 1;
    }

    // 20% base sampling for edge routes
    return 0.2;
  },
});
