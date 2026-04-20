/**
 * Axiom logger singleton — safe to import from Pages Router, App Router,
 * Edge Functions, and `middleware` / `proxy`. Kept separate from
 * `axiom.ts` because the route-handler wrapper depends on `after` from
 * `next/server`, which Turbopack rejects in the Pages Router build graph.
 *
 * Dual transport: Console (always) + AxiomJS (only when `AXIOM_TOKEN` is
 * configured) — keeps local dev working without a token.
 */

import { Axiom } from "@axiomhq/js";
import { AxiomJSTransport, ConsoleTransport, Logger } from "@axiomhq/logging";

import { env } from "@/env/server";

const baseTransport = new ConsoleTransport({
  prettyPrint: env.NODE_ENV === "development",
});

const extraTransports: AxiomJSTransport[] = [];

if (env.AXIOM_TOKEN) {
  const axiomClient = new Axiom({
    token: env.AXIOM_TOKEN,
  });

  extraTransports.push(
    new AxiomJSTransport({
      axiom: axiomClient,
      dataset: env.AXIOM_DATASET,
    }),
  );
}

function resolveBaseUrl(): string {
  if (process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return "http://localhost:3000";
}

export const logger = new Logger({
  transports: [baseTransport, ...extraTransports],
  // process.env used intentionally — Vercel system vars, not in @t3-oss/env-nextjs
  // (auto-injected by Vercel, absent in local dev — graceful fallback)
  args: {
    base_url: resolveBaseUrl(),
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? "local",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
  },
});
