---
name: recollect-caller-migration
description: recollect-caller-migration
---

# Caller Migration

Migrate frontend query hooks from v1 Pages Router URLs to v2 App Router endpoints using the proven 5-layer pattern. Each layer builds on the previous — execute in order, verify between layers.

v2 routes return `T` directly on success and `{error: string}` on failure — no `{data, error}` envelope. Route handlers use the v2 factory (`create-handler-v2.ts`) with `createAxiomRouteHandler(withAuth/withPublic({...}))` composition and `RecollectApiError` throws for error handling. Callers use **ky** (`api` from `api-v2.ts`) — no `getApi`, no v1 URL constants (`NEXT_API_URL` + constant pattern), no envelope unwrapping. V2 callers use `V2_*` constants from `constants.ts` with ky's prefix.

> **Mutation hook refactoring?** Use the `recollect-mutation-hook-refactoring` skill instead. It covers mutation-hook-template.ts restructuring, file renaming, and structural cleanup. This skill handles API caller migration — both query hooks and mutation hooks with ky.

## Scope

**In scope (easy-class):** Query hooks that use simple axios crud helpers or use `getApi`. Straightforward request/response patterns with no session closures or complex type casts.

**In scope (hard-class):** Hooks that import from `supabaseCrudHelpers` with session closures and `QueryFunctionContext`. Session is removed from the `queryFn` (v2 auth is cookie-based) but KEPT in `queryKey` for cache scoping. See "Hard-Class Hooks" section below.

**How to tell the difference:** If the hook imports from `supabaseCrudHelpers` and the crud helper is a simple async function wrapping `axios.get`/`axios.post` with no session parameters, it's easy-class. If the hook uses `useSupabaseClient()`, `session.access_token`, or `QueryFunctionContext<T>`, it's hard-class. Both classes use the same 5-layer pattern; hard-class has additional considerations documented below.

## The 5-Layer Pattern

### Layer 1: Orphaned Constant Cleanup

After migration, the old v1 URL constant (e.g., `CHECK_API_KEY_API`) is replaced by a `V2_*` constant (e.g., `V2_CHECK_GEMINI_API_KEY_API`). The old constant may become orphaned.

**Do not update the old constant to a v2 path — add a new `V2_*` constant instead.** Then:

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
import { API_KEY_CHECK_KEY, V2_CHECK_GEMINI_API_KEY_API } from "@/utils/constants";

type CheckApiKeyResponse = z.infer<typeof CheckGeminiApiKeyOutputSchema>;

export const useFetchCheckApiKey = () =>
  useQuery({
    queryFn: () => api.get(V2_CHECK_GEMINI_API_KEY_API).json<CheckApiKeyResponse>(),
    queryKey: [API_KEY_CHECK_KEY],
  });
```

**Key details:**

- **Import source:** `import { api } from "@/lib/api-helpers/api-v2"` — NOT `getApi` from `api.ts`
- **No leading slash:** `"v2/check-gemini-api-key"` not `"/v2/check-gemini-api-key"` — ky's `prefix` joins `/api` + relative path
- **No async/await needed:** `api.get().json()` returns a Promise directly, which `queryFn` accepts
- **ky auto-throws on non-2xx:** React Query catches in `onError` — no manual error checking needed
- **Zod schema import:** Use `import type` for both the schema and `z` — zero runtime Zod at the consumer. The schema only exists for type inference
- **Response type — choose the right pattern:**
  - **Non-bookmark responses** (simple shapes like `{hasApiKey: boolean}`): Use `z.infer<typeof OutputSchema>` from the v2 route's schema. The Zod type matches the consumer type perfectly
  - **Bookmark data responses** (anything typed as `SingleListData` downstream): Use `.json<SingleListData[]>()` directly — do NOT use `z.infer`. The hand-written `SingleListData` interface diverges structurally from v2 Zod output schemas (different nullability, `user_id` shape, missing `addedTags`). `as SingleListData` casts fail with TS2352. All migrated bookmark hooks (`use-fetch-paginated-bookmarks`, `use-search-bookmarks`, `use-fetch-bookmark-by-id`) use this pattern
- **V2 URL constants:** Add a `V2_*` constant to `src/utils/constants.ts` (e.g., `V2_FETCH_BOOKMARK_BY_ID_API = "v2/bookmarks/get/fetch-by-id"`) and use it in the hook. Remove the old v1 URL constant (`FETCH_BOOKMARK_BY_ID_API`) and `NEXT_API_URL` import if orphaned. V2 constants have no leading slash — ky's `prefix` handles the base
- **File naming:** Rename PascalCase files to kebab-case (`useFetchCheckGeminiApiKey.ts` → `use-fetch-check-gemini-api-key.ts`). Use `git mv` with temp-file two-step for case-only renames on macOS
- **HTTP method:** Always read the v2 route's exported function name (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`) and match the ky method. v1 uses POST for everything — v2 uses semantically correct methods. `api.patch()` for updates, `api.delete()` for deletes, `api.put()` for upserts

**Empty body rule:** When the v2 route's `inputSchema` is `z.object({})` (empty input), ky calls MUST send `{ json: {} }`. The v2 handler calls `request.json()` for non-GET methods — an empty body causes 400. Always read the v2 route's `schema.ts` to check. Example: `api.delete(V2_DELETE_API_KEY_API, { json: {} }).json()`

**Dead payload fields:** Compare the hook's payload type against the v2 `inputSchema`. Remove fields the server gets from auth context (e.g., `id` when v2 uses `user.id` from cookie auth — Zod strips extra fields silently, but the dead field misleads readers). After removing a field from the hook's type, update all consumer call sites that pass it, and chase the orphan chain (the `session` variable and `useSupabaseSession` import may become unused).

**Lint comment cleanup:** Migration often makes lint suppressions unnecessary. Remove these when they no longer apply:
- `@ts-expect-error` comments on crud helper casts — ky's `.json<T>()` is properly typed
- `oxlint-disable @tanstack/query/exhaustive-deps` — often added because session was used in both queryFn and queryKey. After migration, session is only in queryKey (not queryFn), so the rule no longer flags
- `no-unsafe-type-assertion` (`as BookmarkResponse`) — bare response removes the need for type assertion

**`prefer-await-to-then` lint rule:** oxlint enforces `async/await` over `.then()` chains. If you need to map a response (e.g., field name translation), use `async` queryFn:
```typescript
queryFn: async () => {
  const data = await api.get(V2_URL).json<V2Response>();
  return mapToLegacyType(data);
},
```
Do NOT use `.json<T>().then(mapper)` — it triggers the lint rule.

**Reference implementations (Phase 23):**
- `src/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks.ts` — hard-class with session, searchParams, `useInfiniteQuery`
- `src/async/queryHooks/bookmarks/use-fetch-bookmark-by-id.ts` — easy-class, simple `useQuery`
- `src/async/queryHooks/bookmarks/use-fetch-bookmarks-count.ts` — hard-class with field name mapping
- `src/async/queryHooks/ai/api-key/use-fetch-check-gemini-api-key.ts` — Phase 15 pathfinder (canonical for `z.infer` pattern)

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
- **Indirect cache readers:** Also grep for the query key constant (e.g., `BOOKMARKS_COUNT_KEY`) — some components read the cache directly via `queryClient.getQueryData<T>(key)` without importing the hook. These need their cache type generic updated (e.g., `<{ data: T }>` → `<T>`) and their `.data` access removed
- **Utility function param cascades:** Functions like `optionsMenuListArray` that accept cache data as a parameter need their param type updated when the cache shape changes (e.g., `{ data: BookmarksCountTypes } | undefined` → `BookmarksCountTypes | undefined`)
- **`prefer-destructuring` lint rule:** When assigning an array element to a `let` variable, oxlint enforces destructuring. Use `[currentBookmark] = bookmark` instead of `currentBookmark = bookmark[0]`. For `const`, use `const [bookmarkData] = bookmark` instead of `const bookmarkData = bookmark[0]`

**`mutationApiCall` + envelope check breakage (mutation hooks):** Consumers that wrap `mutateAsync` with `mutationApiCall` and then check the v1 envelope shape break silently with v2 bare responses. These patterns all fail:

```typescript
// BROKEN: isNull(undefined) returns false — success block never runs
const response = await mutationApiCall(mutation.mutateAsync(payload));
if (isNull(response?.error)) { successToast("Done"); }

// BROKEN: bare T has no .data property — isNil(undefined) is true, !true is false
if (!isNil(response?.data)) { successToast("Done"); }

// BROKEN: explicit cast doesn't help — property is still undefined
if (isNull((response as { error: Error })?.error)) { ... }
```

**Fix:** Replace `mutationApiCall` wrapper + envelope check with try/catch. Since ky throws on non-2xx and React Query propagates the error, reaching the next line after `mutateAsync()` means success:

```typescript
try {
  await mutation.mutateAsync(payload);
  successToast("Done");
} catch {
  errorToast("Failed");
}
```

**After fixing, chase the orphan chain** — each removal may orphan the next:
1. `mutationApiCall` import → remove if no other call in the file
2. `isNull` / `isNil` import → remove if no other usage in the file
3. `session` variable → may have been used only for `id` in the removed payload (see dead payload fields in Layer 2)
4. `useSupabaseSession` import → remove if `session` was the only consumer

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

### Field Name Mismatch Mapping

When v2 schema field names differ from the hand-written TypeScript interface (e.g., `BookmarksCountTypes` uses `trash` but v2 returns `trashCount`), add a mapping function in the hook's `queryFn` to translate v2 names to the legacy interface. This stores the legacy-shaped data in React Query cache, so all consumers (direct hook callers AND indirect `queryClient.getQueryData` readers) see the expected type without field rename cascades.

```typescript
type V2CountResponse = z.infer<typeof FetchBookmarksCountOutputSchema>;

function mapToBookmarksCountTypes(data: V2CountResponse): BookmarksCountTypes {
  return {
    audio: data.audioCount,
    categoryCount: data.categoryCount,
    everything: data.allCount,
    // ... map each field
  };
}

export default function useFetchBookmarksCount() {
  const session = useSupabaseSession((state) => state.session);

  const { data: bookmarksCountData } = useQuery({
    queryFn: async () => {
      const data = await api.get(V2_URL).json<V2CountResponse>();
      return mapToBookmarksCountTypes(data);
    },
    queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
  });

  return { bookmarksCountData };
}
```

**When to use:** Only when the v2 Zod output schema has structurally different field names from the hand-written TS interface used by consumers. If the field names match (like `SingleListData` vs bookmark schemas — same names, just different nullability), use `.json<LegacyType>()` directly instead.

**This is temporary** — mapping functions are removed when hand-written types are retired in favor of Zod-inferred types post-migration.

**Reference implementation:**
`src/async/queryHooks/bookmarks/use-fetch-bookmarks-count.ts` — Phase 23 field mapping pathfinder

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

## Mutation Hook Migration

Mutation hooks that call crud helpers from `supabaseCrudHelpers/index.ts`. The `mutationFn` replaces the crud helper with a ky call. Same 5-layer pattern applies.

**Key differences from query hooks:**

- **Mutation hooks live at** `src/async/mutationHooks/{domain}/use-{action}-{name}-mutation.ts`
- **ky method matches v2 route** — not always POST. Check the v2 route's export (`PATCH`, `PUT`, `DELETE`, etc.)
- **Fire-and-forget mutations** (return value unused in `onSuccess`/`onSettled`): no consumer response shape updates needed for the ky change itself. But consumers that use `mutationApiCall` + envelope checks still break — see Layer 3 `mutationApiCall` section
- **Return value is often unused:** Most mutation hooks just invalidate queries in `onSuccess`. If `onSuccess` doesn't destructure or read the mutation result, the swap is trivial
- **Type simplification:** v1 hooks often had `as unknown as ResponseType` casts to bridge axios response shape. These are dead weight with ky — remove the interface and cast entirely

```typescript
// Mutation hook with ky — fire-and-forget pattern
export default function useDeleteSharedCategoriesUserMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const deleteSharedCategoriesUserMutation = useMutation({
    mutationFn: (payload: { id: number }) =>
      api.delete(V2_DELETE_SHARED_CATEGORIES_USER_API, { json: payload }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [SHARED_CATEGORIES_TABLE_NAME],
      });
      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
    },
  });
  return { deleteSharedCategoriesUserMutation };
}
```

**Reference implementations (Phase 23 T1 batch):**
- `src/async/mutationHooks/share/use-delete-shared-categories-user-mutation.ts` — DELETE with payload
- `src/async/mutationHooks/user/use-delete-user-mutation.ts` — POST with empty body `{ json: {} }`
- `src/async/mutationHooks/user/use-api-key-user-mutation.ts` — PUT with payload, .tsx→.ts rename
- `src/async/mutationHooks/user/use-remove-user-profile-pic-mutation.ts` — DELETE with empty body, dead `id` field removed
