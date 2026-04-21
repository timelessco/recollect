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
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

const ctx = getServerContext();
if (ctx?.fields) {
  // Observability primitive — allowlisted, stays top-level
  ctx.fields.user_id = userId;
  // Entity IDs BEFORE the operation — suffix-based, land in the `ids` scalar
  ctx.fields.bookmark_id = id;
}

// Input descriptors / counts / flags / outcomes — everything else routes
// through `setPayload`, which merges into the `payload` scalar. The helper
// is a no-op when `ctx` or `ctx.fields` is absent.
setPayload(ctx, { bookmark_count: bookmarks.length });

// ... do work ...

setPayload(ctx, { profile_updated: true });
```

- `ServerContext.fields` is narrowed to a three-branch union: observability primitives (top-level), `_id`/`_ids` suffix keys (collapse into `ids`), and optional `payload: Record<string, unknown>` (collapses into `payload`). A hand-written top-level write that isn't in the observability allowlist or suffix-shaped is a `tsc` error — route it through `setPayload` instead.
- No `console.log`/`console.warn`/`console.error` in handler body
- No direct `logger.info()` calls in the handler body — business context flows via `ctx.fields` + `setPayload` only. Direct `logger.warn/error` is only sanctioned inside `after()` (see pitfall #23 — ALS is gone there).
- `ctx.user_id` is auto-set by `withAuth`; handlers additionally set `ctx.fields.user_id` for explicit wide-event inclusion
- Non-blocking errors: `setPayload(ctx, { junction_error: err.message, junction_error_code: err.code })` instead of throwing
- Auto-included per request: `commit` (VERCEL_GIT_COMMIT_SHA), `region` (VERCEL_REGION)
- Flushing: `after(() => logger.flush())` — deferred, non-blocking

> **Emission convention.** The factory's `partitionFields` collapses handler writes into two JSON scalars so per-handler domain keys don't consume top-level Axiom columns (datasets are capped at 256 columns; prior breach on the legacy `recollect` dataset triggered a fork to `recollect-web-dev` / `recollect-web-prod`).
>
> - Keys ending in `_id` or `_ids` land inside the `ids` scalar — write them directly as `ctx.fields.<entity>_id = …`, except allowlisted observability primitives (e.g. `user_id`) which stay top-level.
> - Anything passed to `setPayload(ctx, { … })` lands inside the `payload` scalar — counts (`*_count`), flags (`has_*`, `is_*`), outcomes (`*_failed`, `*_completed`), and input descriptors.
> - Observability primitives stay top-level: `request_id`, `source`, `user_id`, `trace_id`, `span_id`, `parent_span_id`, `trace_flags`.
> - Analysts filter via `parse_json(fields["ids"]).bookmark_id` / `parse_json(fields["payload"]).<key>` (same pattern as `error_context`, `search_params`).

> **Known bypass paths** (not covered by the narrow): direct `logger.warn/error` calls inside `after()` blocks, enrichment helpers in `src/lib/bookmarks/`, Pages Router SSR routes, and `proxy.ts` pass fields straight to the logger, bypassing `partitionFields`. Any new top-level key name in those paths registers a new Axiom column. Keep payloads to known field names; prefer `setPayload` where ALS is available.

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

- **Inline helpers** (server-safe, avoid client module imports): return `null` on failure, call `setPayload(getServerContext(), { <op>_error: err.message })` for non-blocking error context
- **Imported helpers**: throw `RecollectApiError` directly — propagates to inner-layer catch
- **Closures inside handler**: capture `supabase`/`userId` from enclosing scope

### Queue Consumer Routes (`withRawBody`)

- 3-stage parsing: raw JSON parse → extract queue identifiers → full Zod validation
- `storeQueueError()` BEFORE throwing — safe with `undefined` msgId/queueName
- Error reason format: `"{route}: {failure_point}"` (e.g., `"ai_enrichment: malformed_json"`)
- On success: `supabase.schema("pgmq_public").rpc("delete", ...)` — delete errors are non-throwing (`ctx.fields` only)
- Partial failure: keep message, annotate with `update_queue_message_error` RPC

### Queue Consumer Idempotency Contract

Queue handlers (screenshot, ai-enrichment) must be safe to re-run:

- Upfront SELECT persisted fields; short-circuit capture/upload/DB-write if already set. Flag the skip path via `setPayload(ctx, { <op>_skipped: true })` so Axiom distinguishes fresh runs from replays
- External-response parsing: use shared extractors that throw on unrecognized shape (`src/lib/bookmarks/parse-screenshot-response.ts` is the reference). Guard `byteLength === 0` before persisting — `response.ok` is not sufficient; R2 stores 0-byte uploads and returns `ETag = d41d8cd98f00b204e9800998ecf8427e` (MD5 of empty)
- Enrichment (AI / blurhash / downstream fetch) MUST throw on failure — never silent try/catch. Silent-swallow converts a retryable 503 into a 200 that deletes the pgmq message forever. The archive + replay pipeline is the designed recovery path; don't bypass it
- Idempotency + stale data trap: a non-null persisted URL is not proof the underlying bytes are valid. When recovering from a prior data-corruption bug, NULL the persisted field in `everything` BEFORE replaying via `retry_ai_embeddings_archive` — otherwise the short-circuit re-feeds corrupt bytes to the next layer and `is_final_retry=true` permanently deletes the message
- Full debug playbook (Axiom vs Sentry, archive state SQL, replay recipes, env var gotchas): `~/.claude/projects/-Users-navin-Developer-recollect/memory/reference_queue_route_debugging.md`

### Auth Patterns

- `withAuth`: auto-handles auth, handler gets `{ data, supabase, user }`
- `withSecret`: timing-safe bearer token via `secretEnvVar` config
- `withRawBody` with `auth: "required"`: metadata only for OpenAPI scanner — manual `createApiClient()` + `getApiUser()` + `RecollectApiError("unauthorized")` in handler body, manually set `ctx.user_id`
- **`withPublic` defaults to `createServerServiceClient()`** (synchronous, don't `await`) + explicit handler-side gating. Use for public-data reads (cross-user public shares, discover feed, public category bookmarks), pre-login lookups (provider check), invite flows, queue workers, and any route touching a table without a matching anon RLS policy. RLS coverage in this codebase is incomplete (`categories` and `bookmark_tags` have no anon policies; `everything.anon_discover_access` references the pre-migration boolean `trash` column) — do not lean on it for public reads.
- **`withPublic` + `createApiClient()` + conditional `getApiUser()`** (anon client with optional auth): only when one URL serves two audiences via a request-time discriminator. Canonical example: `search-bookmarks` (discover branch is anon, every other branch requires auth for `user_id` scoping and collaborator checks). See pitfall #34 for the safety checklist.

> Pitfall #28 (always preserve v1's `createApiClient()` call when migrating to `withPublic`) is **superseded** — the factory choice still maps from v1, but the client choice now defaults to service-role.

### Gotchas

- Output schemas for the same DB table must stay aligned across endpoints — same fields, same types, `z.int()` vs `z.number()` matters (BUG-1: caused 500s)
- `SingleListData` diverges from v2 Zod output schemas — different nullability, `user_id` shape. Migrated caller hooks use `.json<SingleListData[]>()` to bypass. Retire post-migration
- `BookmarksCountTypes` field names differ from v2 `FetchBookmarksCountOutputSchema` — `mapToBookmarksCountTypes()` bridges. Retire post-migration
- When migrating callers to v2, always backport handler fixes (validation, auth, error handling) to the still-live v1 Pages Router route

### Response Contract

- v2 returns `T` on success (no envelope); errors return `{ error: string }` + HTTP status. v1 still uses `{ data, error }` envelope — don't mix.
- `src/lib/api-helpers/response.ts` is FROZEN — never modify `apiSuccess` / `apiError` / `apiWarn`. v2 routes use `error()` / `warn()` context helpers from `create-handler-v2.ts` instead.
- v2 URL constants in `api-v2.ts` (the ky `api` instance) have **no leading slash** — `"v2/bookmark/..."`. v1 keeps leading slashes. Both live in `constants.ts`; never inline `"v2/..."` strings at call sites (use `V2_*` constants).
