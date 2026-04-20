"use client";

import type { Formatter } from "@axiomhq/logging";

import { getClientIdentity, getClientRoute } from "./axiom-client-identity";

/**
 * Final client-side formatter. Runs after `nextJsFormatters`, so it sees
 * the fully-built LogEvent.
 *
 * Two jobs:
 *   1. Inject `user_id`, `session_id`, `route` at the event root. These
 *      are the only top-level dataset columns client emissions add —
 *      everything else ends up under `fields.payload`.
 *   2. Collapse `fields.*` into a single `fields.payload` string so each
 *      unique payload key does NOT register a new Axiom column. Mirrors
 *      the server `error_context` / `url.query` / `ids` pattern that
 *      reclaimed slots against the 256-field ceiling.
 *
 * LogEvent keys that stay untouched (owned by the SDK, not per-emission):
 *   `level`, `message` (= event_name), `_time`, `source`, `@app`.
 *
 * Errors inside `fields` have already been normalized to plain objects by
 * the SDK's internal `jsonFriendlyErrorReplacer` before formatters run,
 * so a bare `JSON.stringify` here is safe.
 */
export const recollectIdentityFormatter: Formatter = (logEvent) => {
  const { session_id, user_id } = getClientIdentity();
  const route = getClientRoute();

  // LogEvent.fields is typed `any` in the SDK. Stringify it directly —
  // `JSON.stringify` returns `"{}"` for an empty object and `undefined`
  // for `undefined` input, so a length check is enough to decide whether
  // to emit the collapsed `payload` key at all.
  const fieldsStr = JSON.stringify(logEvent.fields ?? {});
  const payload = fieldsStr === "{}" ? "" : fieldsStr;

  return {
    ...logEvent,
    user_id,
    session_id,
    route,
    fields: payload ? { payload } : {},
  };
};
