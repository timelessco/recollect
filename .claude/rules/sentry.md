---
paths:
  - "src/**/*.{ts,tsx}"
---

## Observability routing

Axiom = manual logging. Sentry = unhandled errors only (auto via `onRequestError`, error boundaries, `browserTracingIntegration`). No dual-capture.

### Sentry allowlist

`Sentry.*` ONLY in `instrumentation*.ts`, `sentry.{server,edge}.config.ts`, `app/{error,global-error}.tsx`, `pages/_error.tsx`, `lib/api-helpers/iphone-share-error-capture.ts`. Elsewhere → Axiom.

### Axiom logger by context

- **v2 route**: `RecollectApiError` → inner-layer `warn` (see `api-v2.md`)
- **App Router**: `logger` from `@/lib/api-helpers/axiom` + `after(() => logger.flush())`
- **Pages Router SSR/ISR**: same `logger`, `await logger.flush()` (`after()` throws E468)
- **Client**: `useLogger()` from `@/lib/api-helpers/axiom-client`

Normalize unknowns with `extractErrorFields(err)` from `errors.ts`. `warn` for handled (404, validation); `error` for infra (DB, network throw, unknown catch, 5xx) — base on cause.

### Grep guard

```sh
rg "Sentry\." src -g '!**/instrumentation*' -g '!**/error.tsx' -g '!**/global-error.tsx' -g '!**/_error.tsx' -g '!**/sentry.*.config.ts' -g '!**/iphone-share-error-capture.ts'
```
