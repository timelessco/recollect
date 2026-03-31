---
name: recollect-caller-migration
description: >
  Frontend caller migration from v1 Pages Router URLs to v2 App Router
  endpoints in Recollect. Encodes the proven 5-layer query-hook migration
  pattern: orphaned constant cleanup, hook rewrite with ky + Zod types,
  consumer verification (v2 responses need no unwrap), dead code cleanup,
  and Pages Router route deprecation. Use this skill whenever the user mentions caller migration,
  wiring up v2, updating a hook to v2, frontend migration, ky migration,
  v2 factory, api-v2, or the check-gemini pattern. For mutation hook
  template refactoring and file renaming, use the
  recollect-mutation-hook-refactoring skill instead.
---

# Caller Migration

Migrate frontend query hooks from v1 Pages Router URLs to v2 App Router endpoints using the proven 5-layer pattern. Each layer builds on the previous — execute in order, verify between layers.

v2 routes return `T` directly on success and `{error: string}` on failure — no `{data, error}` envelope. Route handlers use the v2 factory (`create-handler-v2.ts`) with `createAxiomRouteHandler(withAuth/withPublic({...}))` composition and `RecollectApiError` throws for error handling. Callers use **ky** (`api` from `api-v2.ts`) — no `getApi`, no URL constants, no envelope unwrapping.

> **Mutation hook refactoring?** Use the `recollect-mutation-hook-refactoring` skill instead. It covers mutation-hook-template.ts restructuring, file renaming, and structural cleanup. This skill handles API caller migration (query hooks with ky, mutation hooks with ky when its pathfinder completes).

## Scope

**In scope (easy-class):** Query hooks that use simple axios crud helpers or use `getApi`. Straightforward request/response patterns with no session closures or complex type casts.

**In scope (hard-class):** Hooks that import from `supabaseCrudHelpers` with session closures and `QueryFunctionContext`. Session is removed from the `queryFn` (v2 auth is cookie-based) but KEPT in `queryKey` for cache scoping. See "Hard-Class Hooks" section below.

**How to tell the difference:** If the hook imports from `supabaseCrudHelpers` and the crud helper is a simple async function wrapping `axios.get`/`axios.post` with no session parameters, it's easy-class. If the hook uses `useSupabaseClient()`, `session.access_token`, or `QueryFunctionContext<T>`, it's hard-class. Both classes use the same 5-layer pattern; hard-class has additional considerations documented below.

## The 5-Layer Pattern

### Layer 1: Orphaned Constant Cleanup

With ky's `prefixUrl: "/api"`, callers use inline `"v2/route-name"` — no URL constants needed. The old URL constant (e.g., `CHECK_API_KEY_API`) may become orphaned after migration.

**Do not update the constant to a v2 path.** Instead:

1. After Layer 2, run `pnpm lint:knip` to check if the URL constant is now orphaned
2. If orphaned, remove it from `src/utils/constants.ts`
3. If other code still references it, leave it — it will be cleaned up when those callers migrate

The query key constant (e.g., `API_KEY_CHECK_KEY`) is NOT orphaned — it's still used in the hook's `queryKey`.

### Layer 2: Hook Rewrite

Replace the old caller (`getApi`/axios crud helper) with ky in `queryFn`. The hook file lives at `src/async/queryHooks/{domain}/use-fetch-{name}.ts` (kebab-case per project convention).

```typescript
import { useQuery } from "@tanstack/react-query";

import type { CheckGeminiApiKeyOutputSchema } from "@/app/api/v2/check-gemini-api-key/schema";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";
import { API_KEY_CHECK_KEY } from "@/utils/constants";

type CheckApiKeyResponse = z.infer<typeof CheckGeminiApiKeyOutputSchema>;

export const useFetchCheckApiKey = () =>
  useQuery({
    queryFn: () => api.get("v2/check-gemini-api-key").json<CheckApiKeyResponse>(),
    queryKey: [API_KEY_CHECK_KEY],
  });
```

**Key details:**

- **Import source:** `import { api } from "@/lib/api-helpers/api-v2"` — NOT `getApi` from `api.ts`
- **No leading slash:** `"v2/check-gemini-api-key"` not `"/v2/check-gemini-api-key"` — ky's `prefixUrl` joins `/api` + relative path
- **No async/await needed:** `api.get().json()` returns a Promise directly, which `queryFn` accepts
- **ky auto-throws on non-2xx:** React Query catches in `onError` — no manual error checking needed
- **Zod schema import:** Use `import type` for both the schema and `z` — zero runtime Zod at the consumer. The schema only exists for type inference
- **Response type — choose the right pattern:**
  - **Non-bookmark responses** (simple shapes like `{hasApiKey: boolean}`): Use `z.infer<typeof OutputSchema>` from the v2 route's schema. The Zod type matches the consumer type perfectly
  - **Bookmark data responses** (anything typed as `SingleListData` downstream): Use `.json<SingleListData[]>()` directly — do NOT use `z.infer`. The hand-written `SingleListData` interface diverges structurally from v2 Zod output schemas (different nullability, `user_id` shape, missing `addedTags`). `as SingleListData` casts fail with TS2352. All migrated bookmark hooks (`use-fetch-paginated-bookmarks`, `use-search-bookmarks`, `use-fetch-bookmark-by-id`) use this pattern
- **No URL constants:** Remove `NEXT_API_URL` and endpoint URL constant imports — ky uses inline paths
- **File naming:** Rename PascalCase files to kebab-case (`useFetchCheckGeminiApiKey.ts` → `use-fetch-check-gemini-api-key.ts`). Use `git mv` with temp-file two-step for case-only renames on macOS

**Reference implementation:**
`src/async/queryHooks/ai/api-key/use-fetch-check-gemini-api-key.ts` — Phase 15 pathfinder output (canonical reference)

### Layer 3: Consumer Verification

With ky + bare responses, there is **no unwrapping needed**. The consumer gets `T` directly from React Query's `data` property.

**Why this is simpler than before:**

- v2 bare routes return `T` directly (e.g., `{hasApiKey: boolean}`)
- ky's `.json<T>()` returns `T` to `queryFn`
- React Query's `data` property IS the payload — `data.hasApiKey` works directly

**If the previous caller used `getApi`:**

`getApi` already unwrapped via `handleResponse` — the consumer shape is unchanged. No consumer edits needed.

**If the previous caller used axios crud helpers:**

Consumers need updating: `data.data.field` → `data.field` (the double-unwrap is gone).

```typescript
// Before (with axios crud helper — double-unwrap)
const { data, isLoading } = useFetchCheckApiKey();
if (isLoading || !data?.data) return <Skeleton />;
const { hasApiKey } = data.data;

// After (with ky — flat access)
const { data, isLoading } = useFetchCheckApiKey();
if (isLoading || !data) return <Skeleton />;
const { hasApiKey } = data;
```

**What to check in consumers:**

- Guards: `data?.data` → `data` / `!data?.data` → `!data`
- Destructuring: `data.data.field` → `data.field`
- Optional chaining: `data?.data?.field` → `data?.field`
- Search for all consumers: `ast-grep --lang tsx -p 'useFetchHookName' src/`
- **`prefer-destructuring` lint rule:** When assigning an array element to a `let` variable, oxlint enforces destructuring. Use `[currentBookmark] = bookmark` instead of `currentBookmark = bookmark[0]`. For `const`, use `const [bookmarkData] = bookmark` instead of `const bookmarkData = bookmark[0]`

### Layer 4: Dead Code Removal

After verifying layers 1-3 work (the hook fires the v2 request and the UI renders correctly), remove the now-unused crud helper and its types.

**Sequence matters:** Always rewrite the hook first, verify it works, THEN delete dead code. Never delete before the new code is proven.

1. **Remove crud helper function** from `src/async/supabaseCrudHelpers/index.ts`
2. **Remove response interface** from the same file (only if no other function uses it)
3. **Remove orphaned imports** — check ALL imports used by the deleted function, not just URL constants. Crud helpers may import error constants (e.g., `NO_BOOKMARKS_ID_ERROR`), type imports, or utility constants that become orphaned when the function is deleted. Grep each import to verify it still has consumers
4. **Remove orphaned constants** from `constants.ts` — both URL constants AND any error/utility constants that were only used by the deleted crud helper. Run `pnpm lint:knip` to catch any missed orphans
5. **Verify cleanup:** Run `pnpm lint:knip` to confirm no orphaned exports remain

```bash
# Find what else uses the crud helper before deleting
ast-grep --lang ts -p 'functionName' src/
```

### Layer 5: Deprecate Pages Router Route

After the frontend caller is migrated and dead code is cleaned up, mark the old Pages Router route handler as deprecated so other consumers (extension, mobile, edge functions, cron) know v2 exists.

Add a JSDoc `@deprecated` comment at the top of the file (before the first import):

```typescript
/**
 * @deprecated Use the v2 App Router endpoint instead: /api/v2/{route-name}
 * This Pages Router route will be removed after all consumers are migrated.
 */
import type { NextApiRequest, NextApiResponse } from "next";
```

**Which file?** The Pages Router handler for the endpoint you just migrated:
- Routes under `src/pages/api/v1/` → strip `v1/` for the v2 path (e.g., `v1/check-gemini-api-key` → `/api/v2/check-gemini-api-key`)
- Routes under `src/pages/api/` (non-v1) → same name (e.g., `bookmark/search-bookmarks` → `/api/v2/bookmark/search-bookmarks`)

**Do NOT deprecate routes whose frontend callers have not been migrated yet.** This comment signals "the web frontend no longer calls this" — other consumers use it to plan their own migration.

## Hard-Class Hooks

Hooks with session closures and `QueryFunctionContext` follow the same 5-layer pattern with these additions:

### Session in queryKey, not queryFn

v2 auth is cookie-based — the `queryFn` no longer needs a session parameter. But `session?.user?.id` MUST stay in `queryKey` for cache scoping. Without it, mutation hooks that use `queryClient.getQueryData/setQueryData` with the old key pattern won't find the cached data.

```typescript
// session removed from queryFn, kept in queryKey
const session = useSupabaseSession((state) => state.session);

useInfiniteQuery({
  queryFn: ({ pageParam }) =>
    api.get("v2/bookmark/fetch-bookmarks-data", {
      searchParams: {
        category_id: String(CATEGORY_ID ?? "null"),
        from: pageParam,
        ...(sortBy ? { sort_by: sortBy } : {}),
      },
    }).json<SingleListData[]>(),
  queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
});
```

The `?.` on `session?.user?.id` is required — session type is `{ user: null | User } | undefined` (starts `undefined` before auth).

### searchParams type conversion

`CategoryIdUrlTypes = null | number | string` — ky's `searchParams` doesn't accept `null`. Wrap with `String(CATEGORY_ID ?? "null")` to convert.

### Cache shape compatibility

The old crud helpers returned `{ count, data: T[], error }` per page. v2 returns bare `T[]`. This breaks `page.data` access in mutation hooks, `query-cache-helpers.ts`, `previewLightBox.tsx`, and `useLightboxPrefetch.ts`.

Always use bare response — return the v2 bare array directly from `queryFn`. Update all cache consumers:
- Update `PaginatedBookmarks` type from `{ pages: { data: T[] }[] }` to `{ pages: T[][] }`
- Update mutation hooks: `page.data.filter(...)` → `page.filter(...)`
- Update `query-cache-helpers.ts`: `page.data.find(...)` → `page.find(...)`
- Update lightbox files: `page?.data?.length` → `page?.length`
- Use `PaginatedBookmarks` for paginated cache consumers, keep `BookmarksPaginatedDataTypes` for search (shared with unmigrated search hooks)

**`secondaryQueryKey` warning:** `useReactQueryOptimisticMutation` applies the SAME `updater` to both primary (paginated) and secondary (search) caches. If page shapes diverge (paginated = bare array, search = wrapped), hooks using `secondaryQueryKey` need search handling separated — either via `additionalOptimisticUpdates` with a search-specific updater, or by removing `secondaryQueryKey` and adding search invalidation in `onSettled`.

### Count field

The old crud helper included `count: BookmarksCountTypes` per page — this was redundant. No consumer reads `page.count` from paginated data. Counts are fetched independently via `useFetchBookmarksCount`. Safe to omit.

**Reference implementation:**
`src/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks.ts` — Phase 23 hard-class pathfinder output

## Verification

After completing all 5 layers:

```bash
pnpm fix          # Auto-fix formatting
pnpm lint         # All quality checks
pnpm build        # Confirm build passes
pnpm lint:knip    # Confirm no orphaned exports from dead code removal
```

**Update migration tracker:** Mark the completed row in `docs/CALLER_MIGRATION.md` with `x` in the Status column (per the file's legend: ` ` = not started, `~` = in progress, `x` = done). Do NOT use emoji — characters like ✅ have different widths and break markdown table column alignment.

## Routing Table

| User says | Action |
|-----------|--------|
| "migrate caller" / "wire up v2" / "update hook to v2" | Execute the 5-layer workflow above |
| "ky" / "api-v2" / "bare response" | Execute the 5-layer workflow above |
| "consumer update" / "data.data" / "double unwrap" | See Layer 3 — consumer verification |
| "mutation hook template" / "postApi pattern" | Use `recollect-mutation-hook-refactoring` skill |
| "hard-class" / "session closure" / "QueryFunctionContext" | See "Hard-Class Hooks" section |

## v2 Route Handler Pattern

v2 route handlers import from `create-handler-v2.ts`, not `create-handler.ts`. The v2 factory uses a two-layer composition: `createAxiomRouteHandler(withAuth/withPublic({...}))`. It does its own auth and validation, returning `T` on success and `{error: string}` on failure. No imports from `response.ts` needed.

**Follows `/logging-best-practices` (wide events pattern):**

- **One event per request** — the outer `createAxiomRouteHandler` emits a single wide event at completion with all context (timing, status, user, business fields, error details). No scattered log calls.
- **Error context via fields, not separate logs** — known errors (`RecollectApiError`) add `error.toLogContext()` to `ctx.fields` in the catch block. The outer wide event captures it automatically. No `logger.warn("Known error")` in handler code.
- **Unknown errors** propagate to outer catch → Axiom error log → re-throw → `onRequestError` → Sentry.
- **Business context** added via `getServerContext()?.fields` — no direct `logger.info`/`console.log` in handler body.
- **Environment context** (commit hash, region) included automatically via Logger `args`.

```typescript
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const { data, error: dbError } = await supabase.from("table").select("*");
      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to fetch",
          operation: "fetch_data",
        });
      }

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      return data;
    },
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
    route: "v2-route-name",
  }),
);
```

- `throw RecollectApiError` — caught by `withAuth`/`withPublic`, error context added to `ctx.fields`, returned as `{error: string}` with HTTP status. Outer wide event captures it (never Sentry)
- Unknown throws — caught by outer `createAxiomRouteHandler`, logged as Axiom error, re-thrown to `onRequestError` for Sentry
- `getServerContext()?.fields` — populate with business context for wide events (one log line per request with all context)
- `create-handler.ts` is envelope-only (`{data: T, error: null}`) — used by v1 routes only

**Reference implementation:** `src/app/api/v2/check-gemini-api-key/route.ts` (Phase 17 canonical reference)

### v2 Schema Field Naming

v2 output schema field names MUST match the frontend `SingleListData` convention:
- `addedCategories` (not `categories`)
- `addedTags` (not `tags`)

The frontend rendering components (`bookmarkCardParts.tsx`, `bookmarkCard.tsx`) access these fields directly. A mismatch causes silent `undefined` access — bookmarks render without categories/tags.

Checked: only `fetch-bookmarks-data` had this mismatch (fixed in Phase 23). `search-bookmarks` and `fetch-by-id` already use the correct names. Routes that don't stitch junction data (add-bookmark-min-data, fetch-bookmarks-count, etc.) are unaffected.

## v1 Legacy Note

Existing callers using `getApi`/`postApi` from `api.ts` with `handleResponse` continue working against v1 and envelope v2 routes. Do NOT modify `api.ts` or `response.ts` — they serve v1 callers until v1 dies. New v2 migrations always use `api` from `api-v2.ts`.

## Future Classes

This skill evolves incrementally. New migration classes are added only after their pathfinder proves the pattern.

**Planned additions:**

- **postApi caller migration** — Mutation hooks using `api.post("v2/route").json<T>()` from ky with bare request/response. Will be added to THIS skill after its pathfinder completes (it's still caller migration, not mutation-hook-template refactoring).
