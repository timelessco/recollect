---
paths:
  - "src/**/*.{ts,tsx}"
  - "src/app/api/axiom/route.ts"
---

## Telemetry routing

Axiom = manual logging. Sentry = unhandled errors only (auto via `onRequestError`, error boundaries, `browserTracingIntegration`). No dual-capture.

### Sentry allowlist

`Sentry.*` ONLY in `instrumentation*.ts`, `sentry.{server,edge}.config.ts`, `app/{error,global-error}.tsx`, `pages/_error.tsx`, `lib/api-helpers/iphone-share-error-capture.ts`. Elsewhere → Axiom.

### Axiom logger by context

- **v2 route**: `RecollectApiError` → inner-layer `warn` (see `api-v2.md`). Business context flows through `setPayload(ctx, { … })` from `@/lib/api-helpers/server-context` — never write `ctx.fields.<count/flag/outcome>` directly; `ServerContext.fields` is narrowed at compile time to reject non-observability, non-`_id`-suffix writes. See `api-v2.md § Wide Events` for the three-branch partition contract.
- **App Router**: `logger` from `@/lib/api-helpers/axiom` + `after(() => logger.flush())`
- **Pages Router SSR/ISR**: same `logger`, `await logger.flush()` (`after()` throws E468)
- **Shared utilities** (`src/utils/**`, `src/lib/**` called from BOTH v1 Pages and v2 routes): `setPayload(getServerContext(), { <op>_error: ... })` is **no-op outside v2 ALS**, so it silently drops in v1/Pages/`after()` callers. Pair it with `logger.warn`/`logger.error` from `@/lib/api-helpers/axiom` (safe to import server-side anywhere — flush is owned by the parent handler) so the standalone error row covers the non-v2 paths while the wide-event flag covers v2 trace correlation. `setPayload` alone is only sufficient when the util is provably v2-only.
- **Client**: `clientLogger` from `@/lib/api-helpers/axiom-client`. Never `useLogger` from `@axiomhq/react` — its per-consumer path-cleanup effect calls `logger.flush()` on every unmount, and with widely-used hooks like `useHandleClientError` (transitively mounted behind every React Query wrapper) a single route change fires N-fold duplicate POSTs of the same buffered event. `ConsoleTransport` is gated behind `process.env.NODE_ENV === "development"` — Next.js inlines this at build time so the transport tree-shakes out of preview and production bundles. Never mount it unconditionally.

Normalize unknowns with `extractErrorFields(err)` from `errors.ts`. `warn` for handled (404, validation); `error` for infra (DB, network throw, unknown catch, 5xx) — base on cause.

### Client event classes

| Class | Sentry | Axiom | Rationale |
|---|---|---|---|
| Uncaught exceptions (error boundaries, `instrumentation-client.ts`, `onRouterTransitionStart`) | yes | no | Sentry owns unhandled-crash triage. Error boundaries re-render with a fallback — Axiom timeline does not need the stack. |
| Caught / known client errors (`useHandleClientError`) | no | yes | Handled means expected. Operational signal, not a crash. |
| Cache miss (optimistic-update drift, `logCacheMiss`) | no | yes | Operational signal during replay. Do not add `Sentry.addBreadcrumb` alongside. |
| API-returned 5xx | no | no | Server wide event already owns it; client `route_change` + `trace_id` join the two streams. |
| Navigation (`session_start`, `route_change`) | no | yes | Analytics; Sentry has no use. |
| Named user actions (`bookmark_add_click`, `bookmark_add_submit`, `category_switch`, `share_link_copy`) | no | yes | Analytics; Sentry has no use. |
| Web Vitals (`<WebVitals />`) | no | yes | Already wired. |
| Performance traces | yes (client) | yes (server) | `Sentry.browserTracingIntegration()` owns client traces. Server wide events carry `trace_id`. Don't double-emit. |

Default when unsure: if the event describes *what the user did*, Axiom only; if it describes *what crashed*, Sentry only.

### Top-level field allowlist

Axiom datasets (`recollect-web-dev`, `recollect-web-prod`) have a 256-column ceiling — the legacy `recollect` dataset breached it (258/256) and was retired. Client emissions MUST collapse to this shape:

```
{
  _time, level, message (= event_name),
  user_id, session_id, route,
  fields: { payload: <JSON-stringified blob> }
}
```

`recollect-identity-formatter` enforces the shape — call-sites pass rich payload objects, the formatter stringifies them into a single `fields.payload` column. Adding a top-level field anywhere else is a review-blocker: one new top-level field costs one slot of the remaining budget forever.

`user_id` is the UUID when authenticated, `"anon"` otherwise. Never empty, never the email.

### PII rules

- Never emit raw email, password, auth token, or bookmark title.
- Never emit raw URL query values — the `route_change` helper captures *keys only* (`q,category,sort`).
- Collection ids are hashed via `hashCollectionId()` (first 8 hex of djb2) before emission.
- Categories are bucketed (`bucketCategory` / `bucketHref`) — `collection` / `inbox` / `trash` / `everything` / `discover` / `type_view` / `other`.

### Session & identity lifecycle

- `session_id` lives in `sessionStorage` under `recollect.session_id`; generated lazily in `bootClientSession()`. Tab-scoped — closes with the tab, survives reloads.
- `session_start` fires exactly once per tab, at the moment the id is generated.
- `user_id` flips from `"anon"` to the Supabase UUID when `useSupabaseSession` sets a session. The session_id does NOT rotate on login — pre-auth and post-auth events correlate into one timeline.
- Identity is stored in a module-level ref (`axiom-client-identity.ts`) read by the formatter on every emission. Non-hook emitters (`logCacheMiss`, `WebVitals`) are scoped automatically.

### Sampling

- Floor: `NEXT_PUBLIC_AXIOM_CLIENT_SAMPLE_RATE` (default `1.0`).
- Per-event overrides in `axiom-client-sampling.ts` (`route_change: 0.25`).
- `level: "error"` bypasses sampling — never lose errors.
- Kill switch: `NEXT_PUBLIC_AXIOM_CLIENT_DISABLED=true` drops every emission at the transport layer.

### Adding a new client event

1. Decide the class using the table above. If Sentry: stop — it's auto-captured.
2. Call `emitClientEvent("<event_name>", { ...payload })` from `axiom-client-events.ts`. The formatter handles identity, route, and payload collapse.
3. If the event is high-volume (>1/s per user), add an entry to `EVENT_SAMPLE_RATES` in `axiom-client-sampling.ts` with a rationale comment.
4. Do not introduce new top-level fields.

### Grep guard

```sh
rg "Sentry\." src -g '!**/instrumentation*' -g '!**/error.tsx' -g '!**/global-error.tsx' -g '!**/_error.tsx' -g '!**/sentry.*.config.ts' -g '!**/iphone-share-error-capture.ts'
```
