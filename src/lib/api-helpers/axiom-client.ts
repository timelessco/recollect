"use client";

import { ConsoleTransport, Logger, ProxyTransport } from "@axiomhq/logging";
import { nextJsFormatters } from "@axiomhq/nextjs/client";
import { createUseLogger, createWebVitalsComponent } from "@axiomhq/react";

/**
 * Client-side Axiom Logger.
 *
 * Uses ProxyTransport to forward log events to /api/axiom — AXIOM_TOKEN stays server-only.
 * autoFlush ensures reliable delivery even without navigation events.
 * ConsoleTransport provides dev visibility.
 * nextJsFormatters from /client subpath — NOT root @axiomhq/nextjs (which pulls serverContextFieldsFormatter using ALS).
 */
export const clientLogger = new Logger({
  transports: [new ProxyTransport({ autoFlush: true, url: "/api/axiom" }), new ConsoleTransport()],
  formatters: nextJsFormatters,
});

/** Auto-flushes on route change via internal popstate/pushState/replaceState listeners */
export const useLogger = createUseLogger(clientLogger);

/** Fires CWV metrics (CLS, FID, LCP, INP, FCP, TTFB); flushes on visibilitychange; renders <></> */
export const WebVitals = createWebVitalsComponent(clientLogger);
