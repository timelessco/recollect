---
paths:
  - "src/pages/api/**/*.ts"
  - "src/app/api/**/*.ts"
---

## v1 API Routes

> Legacy routes using `create-handler.ts`. Does NOT apply to `src/app/api/v2/` — see `api-v2.md`. **New routes must use v2.**

### Handler Factories

Nine factories in `/src/lib/api-helpers/create-handler.ts`:

| Function | Auth | Method | Use |
|---|---|---|---|
| `createGetApiHandler` | Public | GET | Public reads |
| `createPostApiHandler` | Public | POST | Public writes |
| `createGetApiHandlerWithAuth` | Required | GET | Auth reads |
| `createPostApiHandlerWithAuth` | Required | POST | Auth creates |
| `createPatchApiHandlerWithAuth` | Required | PATCH | Auth partial updates |
| `createPutApiHandlerWithAuth` | Required | PUT | Auth upserts/replaces |
| `createDeleteApiHandlerWithAuth` | Required | DELETE | Auth deletes |
| `createGetApiHandlerWithSecret` | Secret | GET | Secret-token GETs |
| `createPostApiHandlerWithSecret` | Secret | POST | Secret-token POSTs |

**Config:** `route` (string), `inputSchema` (Zod), `outputSchema` (Zod), `handler` (async fn).
**Context (auth):** `{ data, supabase, user, route }`. **Context (public/secret):** `{ input, route }` — no supabase client provided.
**Return:** raw data → wrapped in `apiSuccess`. `NextResponse` (via `apiWarn`/`apiError`) passed through.

### Response Helpers

| Helper | Use For | Sentry | Status |
|---|---|---|---|
| `parseBody` | Request body validation | No | 400 |
| `apiWarn` | User errors (not found, permissions) | No | 4xx |
| `apiError` | System errors (database failures) | Yes | 500 |
| `apiSuccess` | Success with output validation | No | 200 |

`requireAuth` returns a discriminated union — check `errorResponse` for early return.

### Critical Rules

1. **Root try-catch** — every handler wraps all logic (including auth) in try-catch
2. **Never expose error details** — log server-side, return user-friendly messages
3. **Fail-fast** — check errors immediately, return early
4. **Always send a response** — never return without one (causes hanging requests)

### Log Levels

- `console.log` — entry points, success, flow decisions
- `console.warn` — user-caused issues (auth, validation, duplicates)
- `console.error` — system/database errors

### `vet` Helper

Use for external APIs that throw (axios, fetch) — returns `[error, result]` tuple. Don't use for Supabase (already returns `{ data, error }`).
