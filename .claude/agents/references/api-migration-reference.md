# API Migration Reference

Reference data for the `recollect-api-migrator` agent. Read in Step 1.

Ground truth files — when this reference disagrees with the source, the source wins:

- `src/lib/api-helpers/create-handler-v2.ts` — factory exports and handler context shapes
- `src/lib/api-helpers/errors.ts` — `RecollectApiError`, `ERROR_CODES`
- `src/lib/api-helpers/server-context.ts` — `getServerContext()`, `ServerContext` shape
- `src/lib/api-helpers/axiom.ts` — `createAxiomRouteHandler`, `logger`
- `.claude/rules/api-v2.md` — project-level v2 contract rules

---

## Source → Target Mapping

The migrator converts an App Router v1 route (`src/app/api/<path>/route.ts`) to an App Router v2 twin (`src/app/api/v2/<same-path>/route.ts`). The v1 file stays alive under `@deprecated` for iOS and extension clients.

| Dimension       | v1 (App Router legacy)                                            | v2 (App Router current)                                                                             |
| --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| File path       | `src/app/api/<path>/route.ts`                                     | `src/app/api/v2/<same-path>/route.ts`                                                               |
| URL             | `/api/<path>`                                                     | `/api/v2/<same-path>`                                                                               |
| Factory         | `create{Method}ApiHandler[WithAuth\|WithSecret]` from `create-handler.ts` | `createAxiomRouteHandler(withAuth\|withPublic\|withSecret\|withRawBody({ ... }))` from `create-handler-v2.ts` |
| Response        | `{ data, error }` envelope via `apiSuccess`                       | Bare `T` — factory validates `outputSchema` and wraps in `NextResponse.json(data)`                  |
| Error           | `return apiWarn({...})` / `return apiError({...})`                | `throw new RecollectApiError(code, { cause, message, operation })`                                  |
| Logging         | `console.log` / `warn` / `error`                                  | `const ctx = getServerContext(); if (ctx?.fields) ctx.fields.<key> = <value>`                        |
| Sentry          | `apiError` auto-captures                                          | Never import `@sentry/nextjs` — unknown errors propagate to `onRequestError` where Sentry is wired |
| Fire-and-forget | `void (async () => {...})()` or `.catch(...)`                     | `after(async () => { try ... catch { logger.warn(...) } })` from `next/server`                      |
| Export          | `export const GET = createXxxApiHandler({...})`                   | `export const GET = createAxiomRouteHandler(withXxx({...}))`                                        |

---

## Factory Selection

Map the v1 factory to the v2 wrapper. HTTP method stays the same — the v1 file already picked the correct verb. Export by method name: `export const GET`, `export const POST`, `export const PATCH`, `export const PUT`, `export const DELETE`.

| v1 factory                                                                                         | v2 wrapper   | Handler context                            | Notes                                                                                              |
| -------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `createGetApiHandlerWithAuth` / `createPostApiHandlerWithAuth` / `createPatch...WithAuth` / `createPut...WithAuth` / `createDelete...WithAuth` | `withAuth`   | `{ data, route, supabase, user }`           | 401 thrown automatically; `ctx.user_id` auto-set                                                   |
| `createGetApiHandler` / `createPostApiHandler` (even if the v1 handler manually calls `createApiClient()` inside) | `withPublic` | `{ input, route }`                         | No supabase/user provided — handler creates its own client if needed                               |
| `createGetApiHandlerWithSecret` / `createPostApiHandlerWithSecret`                                 | `withSecret` | `{ input, route }` + config `secretEnvVar` | Uses `timingSafeEqual` internally — don't reimplement                                              |
| `Object.assign(handler, { config })` for multipart / SSE / queue workers                           | `withRawBody` | `{ request, route }` + config `auth?: "none" \| "required"` | Handler owns auth + body parsing; `auth` is OpenAPI metadata only                                  |

Route constant at top of file: `const ROUTE = "v2-<kebab-name>"`. Examples:

- `src/app/api/v2/profiles/toggle-favorite-category/route.ts` → `"v2-profiles-toggle-favorite-category"`
- `src/app/api/v2/bookmark/fetch-bookmarks-data/route.ts` → `"v2-bookmark-fetch-bookmarks-data"`
- `src/app/api/v2/revalidate/route.ts` → `"v2-revalidate"`

---

## Error Codes

From `src/lib/api-helpers/errors.ts`:

| Code                      | HTTP | Use for                                                           |
| ------------------------- | ---- | ----------------------------------------------------------------- |
| `bad_request`             | 400  | Malformed JSON, Zod validation, missing fields                    |
| `unauthorized`            | 401  | Auth failures — thrown automatically by `withAuth` / `withSecret` |
| `forbidden`               | 403  | Ownership / access checks                                         |
| `not_found`               | 404  | Missing record (including Postgrest `PGRST116`)                   |
| `bookmark_not_found`      | 404  | Domain-specific missing bookmark                                  |
| `conflict`                | 409  | Unique-violation (Postgres `23505`)                               |
| `unprocessable_entity`    | 422  | Semantic validation failures                                      |
| `category_limit_reached`  | 422  | Category limit exceeded                                           |
| `rate_limit_exceeded`     | 429  | Rate limiting                                                     |
| `service_unavailable`     | 503  | DB / storage / external-API failures                              |

Constructor:

```typescript
throw new RecollectApiError(code, {
  message,    // required — user-safe string, returned in { error: message } HTTP body
  cause,      // optional — underlying error object (Error, PostgrestError, fetch rejection)
  operation,  // optional — snake_case identifier for Axiom search
  context,    // optional — extra structured fields for logging only
});
```

Rules:

- **Always pass `cause`** when wrapping a caught error (DB, fetch, storage). `extractCauseFields` reads `cause_message`, `cause_code`, `cause_details`, `cause_hint` off the cause for Axiom.
- **Omit `cause`** for pure business-logic conditions (access denied, not found, validation).
- **Never** `import * as Sentry from "@sentry/nextjs"` inside a v2 route. Unknown errors propagate from the inner layer to the outer `createAxiomRouteHandler`, which logs to Axiom and rethrows to Next.js `onRequestError` where Sentry is wired.
- **Never** `return apiError(...)` / `return apiWarn(...)` / `return NextResponse.json({ error })` in v2 — always `throw new RecollectApiError(...)`.
- **Never** log an error before throwing — the factory catch block logs it with full context. Pre-logging creates duplicate Axiom entries.
- **Never** `throw new Error(...)` in v2 route handlers — always `RecollectApiError`. Plain errors are treated as unknown (Sentry) and lose the HTTP-status mapping.

---

## v1 → v2 Error Mapping

| v1 pattern                                                            | v2 replacement                                                                                     |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `return apiWarn({ status: 400, message })`                            | `throw new RecollectApiError("bad_request", { message })`                                          |
| `return apiWarn({ status: 403, message, context })`                   | `throw new RecollectApiError("forbidden", { message, context })`                                   |
| `return apiWarn({ status: 404, message })` / Postgrest `PGRST116`     | `throw new RecollectApiError("not_found", { message })`                                            |
| `if (error.code === "23505") return apiWarn({ status: 409, ... })`    | `throw new RecollectApiError("conflict", { cause: error, message, operation })`                    |
| `return apiError({ error, message, operation })`                      | `throw new RecollectApiError("service_unavailable", { cause: error, message, operation })`        |
| `createApiClient()` manually in handler body (public factory)         | Keep the manual call — use `withPublic` (OpenAPI marks it as unauthenticated)                      |
| `res.revalidate(path)` (Pages Router leftover)                        | `revalidatePath(path)` from `next/cache`                                                           |
| `res.setHeader(...)` for CORS                                         | `new NextResponse(body, { headers: { ... } })` — handler returns the response directly            |

### Observability

Every request emits one wide event. Business context is attached via `getServerContext()?.fields`:

```typescript
import { getServerContext } from "@/lib/api-helpers/server-context";

const ctx = getServerContext();
if (ctx?.fields) {
  // Entity IDs and input context BEFORE the operation
  ctx.fields.user_id = user.id;
  ctx.fields.category_id = categoryId;
}

// ... do work ...

if (ctx?.fields) {
  // Outcome flags AFTER the operation
  ctx.fields.result_count = rows.length;
  ctx.fields.toggled = true;
}
```

- `ctx.user_id` is auto-set by `withAuth` (the factory's ALS context, separate from `ctx.fields`). Handlers additionally set `ctx.fields.user_id` when they want the user ID on the success path's wide event.
- Never `console.log` / `console.warn` / `console.error` in v2 handler bodies.
- Never `logger.info()` directly for business context — fields flow through `ctx.fields`.
- Non-blocking errors (queue delete, enrichment failure): log to `ctx.fields` (e.g., `ctx.fields.queue_delete_error = msg`) instead of throwing.

Auto-included per request by the outer factory — don't re-emit:

- `request_id` (UUID)
- `source` — `"web"` (no auth header) / `"ios"` (bearer user JWT) / `"edge-function"` (matches `SUPABASE_SERVICE_KEY`)
- `commit` (`VERCEL_GIT_COMMIT_SHA`)
- `region` (`VERCEL_REGION`)
- `user_id` (when `withAuth` resolves)

---

## Fire-and-Forget via `after()`

```typescript
import { after } from "next/server";

import { logger } from "@/lib/api-helpers/axiom";

after(async () => {
  try {
    await someEnrichmentFn({ ... });
  } catch (error) {
    logger.warn("[route-name] after() enrichment failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
```

- Register `after()` **before** throwing if the enrichment should run on failure too.
- ALS is gone inside `after()` — populate `ctx.fields` before `return`, use `logger` directly inside the callback.
- Never `void (async () => {...})()` — breaks tracing and trips `no-floating-promises`.

---

## Handler Return Behavior

- Return raw data → factory calls `outputSchema.safeParse()` and wraps in `NextResponse.json(validated.data)`.
- Return `NextResponse` directly → factory passes through (binary responses, redirects, dynamic CORS).
- Output validation failures throw a programmer error — they are always a schema bug, never a user error.
- `withRawBody` handlers always return `NextResponse` directly (no output-schema wrapping).

---

## OpenAPI Integration

- The scanner reads `.config` off the exported handler. `createAxiomRouteHandler` passes `.config` through from the inner `withXxx` layer.
- Scanner detects v2 via `config.contract === "v2"` and uses bare response schemas (no envelope).
- Per-route supplement: `src/lib/openapi/endpoints/<domain>/v2-<kebab-name>.ts` — data-only `EndpointSupplement` export.
- Barrel: add `export { v2<CamelName>Supplement } from "./v2-<kebab-name>"` to `src/lib/openapi/endpoints/<domain>/index.ts`.
- `path` in the supplement uses a leading slash (`"/v2/<same-path>"`) — OpenAPI convention.
- Security: `[{ [bearerAuth.name]: [] }, {}]` for auth routes (empty `{}` means cookie auth also accepted); `[]` for public routes.
- Regen: `npx tsx scripts/generate-openapi.ts && npx tsx scripts/merge-openapi-supplements.ts`.

---

## V2 URL Constants

Append to `src/utils/constants.ts`:

```typescript
export const V2_<SCREAMING_NAME>_API = "v2/<domain>/<kebab-name>";
```

No leading slash — the `api` ky instance in `src/lib/api-helpers/api-v2.ts` prefixes `/api`. v1 constants keep their leading slash and use `postApi`/`getApi` from `src/lib/api-helpers/api.ts`; v2 constants are slashless and use `api.get()` / `api.post()`.

---

## Caller Repoint

Find callers for the specific route being migrated:

```bash
grep -rn "<v1-constant-name>\|<old-path>" src/async src/pageComponents src/components src/hooks
```

Repoint each caller:

```typescript
// Before (v1)
import { postApi } from "@/lib/api-helpers/api";
import { TOGGLE_FAVORITE_CATEGORY_API } from "@/utils/constants";

const { data, error } = await postApi<Response>(TOGGLE_FAVORITE_CATEGORY_API, payload);

// After (v2)
import { api } from "@/lib/api-helpers/api-v2";
import { V2_TOGGLE_FAVORITE_CATEGORY_API } from "@/utils/constants";

const data = await api
  .post(V2_TOGGLE_FAVORITE_CATEGORY_API, { json: payload })
  .json<Response>();
```

- GET with query params: `api.get(URL, { searchParams }).json<T>()`.
- v2 throws on HTTP errors (no envelope) — wrap in try/catch at the call site and update the mutation hook's error handling (inspect the `HTTPError` response for `{ error: string }`).
- Only repoint callers that hit the exact route being migrated. Leave every other caller untouched.

---

## v1 Route File: `@deprecated` Only

Add directly above the `export const GET` / `POST` in the v1 file:

```typescript
/**
 * @deprecated Use /api/v2/<same-path> instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({ ... });
```

`git diff` on the v1 file must show only the JSDoc hunk. No other edit — no import reshuffling, no whitespace drift, no error-handling fixes. Backport any critical handler fix in a separate commit.
