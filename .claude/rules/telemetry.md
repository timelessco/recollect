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

- **v2 route**: `RecollectApiError` → inner-layer `warn` (see `api-v2.md`)
- **App Router**: `logger` from `@/lib/api-helpers/axiom` + `after(() => logger.flush())`
- **Pages Router SSR/ISR**: same `logger`, `await logger.flush()` (`after()` throws E468)
- **Client**: `useLogger()` from `@/lib/api-helpers/axiom-client`

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

Axiom dev dataset is near its 256-column ceiling. Client emissions MUST collapse to this shape:

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
