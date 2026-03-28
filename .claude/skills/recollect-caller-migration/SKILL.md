---
name: recollect-caller-migration
description: >
  Frontend caller migration from v1 Pages Router URLs to v2 App Router
  endpoints in Recollect. Encodes the proven 4-layer query-hook migration
  pattern: orphaned constant cleanup, hook rewrite with ky + Zod types,
  consumer verification (v2 responses need no unwrap), and dead code
  cleanup. Use this skill whenever the user mentions caller migration,
  wiring up v2, updating a hook to v2, frontend migration, ky migration,
  v2 factory, api-v2, or the check-gemini pattern. For mutation hook
  template refactoring and file renaming, use the
  recollect-mutation-hook-refactoring skill instead.
---

# Caller Migration

Migrate frontend query hooks from v1 Pages Router URLs to v2 App Router endpoints using the proven 4-layer pattern. Each layer builds on the previous — execute in order, verify between layers.

v2 routes return `T` directly on success and `{error: string}` on failure — no `{data, error}` envelope. Route handlers use the v2 factory (`create-handler-v2.ts`) which injects `error()` and `warn()` helpers into the handler context. Callers use **ky** (`api` from `api-v2.ts`) — no `getApi`, no URL constants, no envelope unwrapping.

> **Mutation hook refactoring?** Use the `recollect-mutation-hook-refactoring` skill instead. It covers mutation-hook-template.ts restructuring, file renaming, and structural cleanup. This skill handles API caller migration (query hooks with ky, mutation hooks with ky when its pathfinder completes).

## Scope

**In scope (easy-class):** Query hooks that use simple axios crud helpers or use `getApi`. These have straightforward request/response patterns with no session closures or complex type casts.

**Out of scope (hard-class):** 31 axios callers with session closures, `QueryFunctionContext`, complex type casts. These need their own pathfinder before the pattern can be encoded. Do not attempt to migrate hard-class hooks with this skill.

**How to tell the difference:** If the hook imports from `supabaseCrudHelpers` and the crud helper is a simple async function wrapping `axios.get`/`axios.post` with no session parameters, it's easy-class. If the hook uses `useSupabaseClient()`, `session.access_token`, or `QueryFunctionContext<T>`, it's hard-class.

## The 4-Layer Pattern

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
- **Response type:** Define as `z.infer<typeof OutputSchema>` using the v2 route's Zod output schema from `src/app/api/v2/{endpoint}/schema.ts`
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

### Layer 4: Dead Code Removal

After verifying layers 1-3 work (the hook fires the v2 request and the UI renders correctly), remove the now-unused crud helper and its types.

**Sequence matters:** Always rewrite the hook first, verify it works, THEN delete dead code. Never delete before the new code is proven.

1. **Remove crud helper function** from `src/async/supabaseCrudHelpers/index.ts`
2. **Remove response interface** from the same file (only if no other function uses it)
3. **Remove orphaned imports** — check each remaining import in the file is still used
4. **Remove orphaned URL constants** from `constants.ts` if `pnpm lint:knip` flags them
5. **Verify cleanup:** Run `pnpm lint:knip` to confirm no orphaned exports remain

```bash
# Find what else uses the crud helper before deleting
ast-grep --lang ts -p 'functionName' src/
```

## Verification

After completing all 4 layers:

```bash
pnpm fix          # Auto-fix formatting
pnpm lint         # All quality checks
pnpm build        # Confirm build passes
pnpm lint:knip    # Confirm no orphaned exports from dead code removal
```

## Routing Table

| User says | Action |
|-----------|--------|
| "migrate caller" / "wire up v2" / "update hook to v2" | Execute the 4-layer workflow above |
| "ky" / "api-v2" / "bare response" | Execute the 4-layer workflow above |
| "consumer update" / "data.data" / "double unwrap" | See Layer 3 — consumer verification |
| "mutation hook template" / "postApi pattern" | Use `recollect-mutation-hook-refactoring` skill |
| "hard-class" / "session closure" / "QueryFunctionContext" | Not yet encoded — needs its own pathfinder first |

## v2 Route Handler Pattern

v2 route handlers import from `create-handler-v2.ts`, not `create-handler.ts`. The v2 factory is self-contained — it does its own auth and validation, returning `T` on success and `{error: string}` on failure. No imports from `response.ts` needed.

The handler context provides `error()` and `warn()` helpers so route handlers never need to import Sentry, NextResponse, or apiError directly:

```typescript
import { createGetApiHandlerV2WithAuth } from "@/lib/api-helpers/create-handler-v2";

export const GET = createGetApiHandlerV2WithAuth({
  handler: async ({ error, route, supabase, user }) => {
    const { data, error: dbError } = await supabase.from("table").select("*");
    if (dbError) {
      return error({ cause: dbError, message: "Failed to fetch", operation: "fetch_data" });
    }
    return data;
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  route: "v2-route-name",
});
```

- `error()` — logs, captures in Sentry, returns `{error: string}` with status (default 500)
- `warn()` — logs, returns `{error: string}` with required status (no Sentry)
- `create-handler.ts` is envelope-only (`{data: T, error: null}`) — used by v1 routes and v2 routes that haven't migrated yet

**Reference implementation:** `src/app/api/v2/check-gemini-api-key/route.ts`

## v1 Legacy Note

Existing callers using `getApi`/`postApi` from `api.ts` with `handleResponse` continue working against v1 and envelope v2 routes. Do NOT modify `api.ts` or `response.ts` — they serve v1 callers until v1 dies. New v2 migrations always use `api` from `api-v2.ts`.

## Future Classes

This skill evolves incrementally. New migration classes are added only after their pathfinder proves the pattern.

**Planned additions:**

- **postApi caller migration** — Mutation hooks using `api.post("v2/route").json<T>()` from ky with bare request/response. Will be added to THIS skill after its pathfinder completes (it's still caller migration, not mutation-hook-template refactoring).
- **Hard-class migration** — 31 axios callers with session closures, `QueryFunctionContext`, and complex type casts. Requires its own pathfinder to establish the pattern before encoding.

Do not attempt to migrate these classes until their patterns are proven and added to this skill.
