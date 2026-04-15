import * as Sentry from "@sentry/nextjs";

export async function register() {
  // process.env used intentionally — NEXT_RUNTIME checked before Sentry init, not in env schema
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
