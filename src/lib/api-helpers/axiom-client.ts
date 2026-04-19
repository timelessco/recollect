"use client";

import { ConsoleTransport, Logger, ProxyTransport } from "@axiomhq/logging";
import { nextJsFormatters } from "@axiomhq/nextjs/client";
import { createUseLogger, createWebVitalsComponent } from "@axiomhq/react";

import { recollectIdentityFormatter } from "./axiom-client-formatters";
import { SampledTransport } from "./axiom-client-sampling";

/**
 * Client-side Axiom Logger.
 *
 * Pipeline per emission:
 *   call-site → nextJsFormatters → recollectIdentityFormatter
 *             → SampledTransport → ProxyTransport → /api/axiom
 *
 * `recollectIdentityFormatter` injects `user_id` / `session_id` / `route`
 * at the event root and collapses `fields.*` into one stringified
 * `fields.payload` scalar — schema-budget guard for the 256-field ceiling.
 *
 * `SampledTransport` wraps `ProxyTransport` so high-volume events
 * (`route_change`) can be sampled without touching call-sites. Errors
 * bypass sampling.
 *
 * autoFlush ensures reliable delivery even without navigation events.
 *
 * ConsoleTransport is mounted only in development so end-users never see
 * telemetry events in their browser console. Next.js inlines
 * `process.env.NODE_ENV` at build time, so the transport (and its import)
 * tree-shakes out of production bundles.
 */
export const clientLogger = new Logger({
  transports: [
    new SampledTransport(new ProxyTransport({ autoFlush: true, url: "/api/axiom" })),
    ...(process.env.NODE_ENV === "development" ? [new ConsoleTransport()] : []),
  ],
  formatters: [...nextJsFormatters, recollectIdentityFormatter],
});

/** Auto-flushes on route change via internal popstate/pushState/replaceState listeners */
export const useLogger = createUseLogger(clientLogger);

/** Fires CWV metrics (CLS, FID, LCP, INP, FCP, TTFB); flushes on visibilitychange; renders <></> */
export const WebVitals = createWebVitalsComponent(clientLogger);
