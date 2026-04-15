---
paths:
  - "src/app/api/v2/**/*.ts"
  - "src/lib/api-helpers/create-handler-v2.ts"
  - "src/lib/api-helpers/errors.ts"
  - "src/lib/api-helpers/server-context.ts"
---

## v2 API Routes

### Patterns

- Mutation hooks: `use-{action}-{resource}-mutation.ts` — no "optimistic" in filename
- Test via Scalar UI at `/api-docs` (cookie auth works when logged in)
- After modifying a route: update Zod schemas in `schema.ts` + supplement in `src/lib/openapi/endpoints/<domain>/` + named examples in `-examples.ts`
- `/api/dev/session` requires browser session cookies — never hardcode JWTs in `.http` files
- Constants shared with Deno Edge Functions: define in `src/utils/constants.ts`, add sync comment in Deno files
- Ground-truth CodeRabbit suggestions against runtime behavior before implementing

### Handler Composition

Two-layer pattern:

```
createAxiomRouteHandler(withAuth/withPublic/withRawBody/withSecret({ handler, inputSchema, outputSchema, route }))
```

| Layer | Function | Responsibility |
|---|---|---|
| Outer | `createAxiomRouteHandler` | Axiom logger setup, `after(() => logger.flush())` deferred flushing, unknown error catch (Axiom error log + re-throw for Sentry), `.config` passthrough for OpenAPI scanner |
| Inner | `withAuth` / `withPublic` / `withRawBody` / `withSecret` | Auth validation, input/output Zod validation, `RecollectApiError` catch (Axiom warn + HTTP response), success response |

| Factory | Auth | Handler receives | Use case |
|---|---|---|---|
| `withAuth` | User JWT (auto) | `{ data, supabase, user }` | Most routes |
| `withPublic` | None (handler decides) | `{ data, route }` | Public reads, conditional auth |
| `withRawBody` | None (`auth` field is metadata) | `{ request, route }` | Queue consumers, FormData uploads |
| `withSecret` | Timing-safe bearer token | `{ data, route }` | Internal-only endpoints |

**Return:** raw data → factory validates via `outputSchema.safeParse()` and wraps in `NextResponse.json()`. Exception: `withRawBody` returns `NextResponse` directly.

### Error Handling

`RecollectApiError` constructor:

```typescript
throw new RecollectApiError("service_unavailable", {
  cause: error,            // optional — underlying error object
  message: "Failed to X",  // required — user-safe message
  operation: "some_op",    // optional — snake_case for Axiom search
  context: { ... },        // optional — extra structured context (Zod issues)
});
```

Error codes:

| Code | HTTP | Use for |
|---|---|---|
| `bad_request` | 400 | Malformed JSON, Zod validation, missing fields |
| `unauthorized` | 401 | Auth failures |
| `forbidden` | 403 | Access check failures |
| `not_found` | 404 | Missing bookmark/category/invite |
| `conflict` | 409 | Duplicate collaboration, already-accepted invite |
| `unprocessable_entity` | 422 | Semantic validation failures |
| `category_limit_reached` | 422 | Category limit exceeded |
| `rate_limit_exceeded` | 429 | Rate limiting |
| `service_unavailable` | 503 | DB/storage/external-API errors |

**`cause` rules:**

- ALWAYS pass `cause` when wrapping a caught error (DB, fetch, storage)
- OMIT `cause` for business logic conditions with no underlying error (access denied, not found, validation)
- Helper functions rethrowing: use `new Error(msg, { cause: error })` (ES2022) to preserve the chain
- `extractCauseFields` reads `cause_message`, `cause_code`, `cause_details`, `cause_hint` — duck-typed, works with any object (not just `Error` instances)
- Never string-concatenate error messages — use `cause`
- Never `throw new Error(...)` in route handlers or helpers called by routes — always `RecollectApiError`

### Error Routing

- **Known errors** (`RecollectApiError`): inner layer catches → Axiom `warn` → HTTP response → **never Sentry**
- **Unknown errors**: outer layer catches → Axiom `error` → re-throw → `onRequestError` → **Sentry**
- Never import Sentry directly in v2 handlers
- Never call `apiError()`/`apiWarn()`/`apiSuccess()` in v2 handlers

### Wide Events (Observability)

```typescript
import { getServerContext } from "@/lib/api-helpers/server-context";

const ctx = getServerContext();
if (ctx?.fields) {
  // Entity IDs + input context BEFORE the operation
  ctx.fields.user_id = userId;
  ctx.fields.bookmark_id = id;
}

// ... do work ...

if (ctx?.fields) {
  // Outcome flags AFTER the operation
  ctx.fields.profile_updated = true;
}
```

- No `console.log`/`console.warn`/`console.error` in handler body
- No direct `logger.info()` calls — business context flows via `ctx.fields` only
- `ctx.user_id` is auto-set by `withAuth`; handlers additionally set `ctx.fields.user_id` for explicit wide-event inclusion
- Non-blocking errors: log to `ctx.fields` (e.g., `junction_error`, `queue_delete_error`) instead of throwing
- Auto-included per request: `commit` (VERCEL_GIT_COMMIT_SHA), `region` (VERCEL_REGION)
- Flushing: `after(() => logger.flush())` — deferred, non-blocking

### `after()` Patterns

Fire-and-forget enrichment — ALWAYS wrap body in try/catch:

```typescript
after(async () => {
  try {
    await someEnrichmentFn({ ... });
  } catch (error) {
    logger.warn("[route-name] after() enrichment failed", {
      bookmark_id: id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
```

- ALS is gone inside `after()` (Pitfall #23) — populate `ctx.fields` BEFORE return, use `logger` directly inside `after()`
- Register `after()` BEFORE throwing if enrichment should run on failure too

### Response Patterns

- Success: `return data` — factory wraps in `NextResponse.json()`
- `NextResponse.json()` escape hatch: dynamic RPC results, FormData routes (`withRawBody`), redirects
- `withPublic` passes `NextResponse` instances through directly (e.g., `NextResponse.redirect()`)

### Schema Conventions

- File: `schema.ts` colocated with `route.ts`
- Naming: `{RouteName}InputSchema` / `{RouteName}OutputSchema`
- Every field: `.meta({ description: "..." })` — flows to OpenAPI spec
- `z.int()` over `z.number().int()`, `z.url()` for URLs, `z.uuid()` for UUIDs, `z.email()` for emails
- `z.string()` for timestamps (Supabase `timestamptz` uses `+00:00`, not `Z`)
- Empty input: `z.object({})` for GET routes with no params
- `category_id` inputs: `.min(0)` per domain convention

### Helper Functions

- **Inline helpers** (server-safe, avoid client module imports): return `null` on failure, log to `ctx.fields`
- **Imported helpers**: throw `RecollectApiError` directly — propagates to inner-layer catch
- **Closures inside handler**: capture `supabase`/`userId` from enclosing scope

### Queue Consumer Routes (`withRawBody`)

- 3-stage parsing: raw JSON parse → extract queue identifiers → full Zod validation
- `storeQueueError()` BEFORE throwing — safe with `undefined` msgId/queueName
- Error reason format: `"{route}: {failure_point}"` (e.g., `"ai_enrichment: malformed_json"`)
- On success: `supabase.schema("pgmq_public").rpc("delete", ...)` — delete errors are non-throwing (`ctx.fields` only)
- Partial failure: keep message, annotate with `update_queue_message_error` RPC

### Auth Patterns

- `withAuth`: auto-handles auth, handler gets `{ data, supabase, user }`
- `withRawBody` with `auth: "required"`: metadata only for OpenAPI scanner — manual `createApiClient()` + `getApiUser()` + `RecollectApiError("unauthorized")` in handler body, manually set `ctx.user_id`
- `withPublic` with conditional auth: manual `createApiClient()`, set `alsCtx.user_id` manually
- `withSecret`: timing-safe bearer token via `secretEnvVar` config
- `createServerServiceClient()` (synchronous, don't `await`): for RLS-bypass operations (queue workers, admin deletes, public data)

### Gotchas

- Output schemas for the same DB table must stay aligned across endpoints — same fields, same types, `z.int()` vs `z.number()` matters (BUG-1: caused 500s)
- `SingleListData` diverges from v2 Zod output schemas — different nullability, `user_id` shape. Migrated caller hooks use `.json<SingleListData[]>()` to bypass. Retire post-migration
- `BookmarksCountTypes` field names differ from v2 `FetchBookmarksCountOutputSchema` — `mapToBookmarksCountTypes()` bridges. Retire post-migration
- When migrating callers to v2, always backport handler fixes (validation, auth, error handling) to the still-live v1 Pages Router route
