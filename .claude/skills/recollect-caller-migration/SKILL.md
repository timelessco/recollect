---
name: recollect-caller-migration
description: >
  Frontend caller migration from v1 Pages Router URLs to v2 App Router
  endpoints in Recollect. Encodes the proven 4-layer query-hook migration
  pattern: constant URL update, hook rewrite with getApi + Zod types,
  consumer double-unwrap removal, and dead code cleanup. Use this skill
  whenever the user mentions caller migration, wiring up v2, updating a
  hook to v2, frontend migration, getApi migration, or the check-gemini
  pattern. For mutation hook template refactoring and file renaming, use
  the recollect-mutation-hook-refactoring skill instead.
---

# Caller Migration

Migrate frontend query hooks from v1 Pages Router URLs to v2 App Router endpoints using the proven 4-layer pattern. Each layer builds on the previous — execute in order, verify between layers.

> **Mutation hook refactoring?** Use the `recollect-mutation-hook-refactoring` skill instead. It covers mutation-hook-template.ts restructuring, file renaming, and structural cleanup. This skill handles API caller migration (getApi now, postApi when its pathfinder completes).

## Scope

**In scope (easy-class):** Query hooks that use simple axios crud helpers or already use `getApi`. These have straightforward request/response patterns with no session closures or complex type casts.

**Out of scope (hard-class):** 31 axios callers with session closures, `QueryFunctionContext`, complex type casts. These need their own pathfinder before the pattern can be encoded. Do not attempt to migrate hard-class hooks with this skill.

**How to tell the difference:** If the hook imports from `supabaseCrudHelpers` and the crud helper is a simple async function wrapping `axios.get`/`axios.post` with no session parameters, it's easy-class. If the hook uses `useSupabaseClient()`, `session.access_token`, or `QueryFunctionContext<T>`, it's hard-class.

## The 4-Layer Pattern

### Layer 1: Constant URL Update

Update the URL constant in `src/utils/constants.ts`. The constant name stays the same — only the value changes.

```typescript
// Before
export const CHECK_API_KEY_API = "/v1/check-gemini-api-key";

// After
export const CHECK_API_KEY_API = "/v2/check-gemini-api-key";
```

Find the constant by searching for the v1 endpoint path in `constants.ts`. The v2 path matches the App Router directory structure under `src/app/api/v2/`.

### Layer 2: Hook Rewrite

Replace the axios crud helper call with an inline `getApi` call in `queryFn`. The hook file lives at `src/async/queryHooks/{domain}/use-fetch-{name}.ts` (kebab-case per project convention).

```typescript
import { useQuery } from "@tanstack/react-query";

import type { CheckGeminiApiKeyOutputSchema } from "@/app/api/v2/check-gemini-api-key/schema";
import type { z } from "zod";

import { getApi } from "@/lib/api-helpers/api";
import { API_KEY_CHECK_KEY, CHECK_API_KEY_API, NEXT_API_URL } from "@/utils/constants";

type CheckApiKeyResponse = z.infer<typeof CheckGeminiApiKeyOutputSchema>;

export const useFetchCheckApiKey = () =>
  useQuery({
    queryFn: () => getApi<CheckApiKeyResponse>(`${NEXT_API_URL}${CHECK_API_KEY_API}`),
    queryKey: [API_KEY_CHECK_KEY],
  });
```

**Key details:**

- **Zod schema import:** Use `import type` for both the schema and `z` — zero runtime Zod at the consumer. The schema only exists for type inference.
- **Response type:** Define as `z.infer<typeof OutputSchema>` using the v2 route's Zod output schema from `src/app/api/v2/{endpoint}/schema.ts`.
- **URL construction:** Always `\`${NEXT_API_URL}${URL_CONSTANT}\`` where `NEXT_API_URL = "/api"` and the constant includes the version prefix.
- **File naming:** Rename PascalCase files to kebab-case (`useFetchCheckGeminiApiKey.ts` → `use-fetch-check-gemini-api-key.ts`). Use `git mv` with temp-file two-step for case-only renames on macOS.

**Reference implementations:**
- `src/async/queryHooks/ai/api-key/use-fetch-check-gemini-api-key.ts` — Phase 13 pathfinder output (canonical reference)
- `src/async/queryHooks/bookmarks/use-fetch-discoverable-bookmark-by-id.ts` — Pre-existing getApi hook

### Layer 3: Consumer Update (Double-Unwrap Removal)

After Layer 2, consumers need updating because the data shape changes. This is the most subtle layer — understanding **why** the shape changes prevents bugs.

**The root cause — `handleResponse` envelope stripping:**

`getApi` calls `handleResponse` (lines 8-16 of `src/lib/api-helpers/api.ts`), which does:
```typescript
const handleResponse = async <T>(response: Response): Promise<T> => {
  const json = await fetchJson<ApiResponse<T>>(response);
  if (!response.ok || json.error !== null) {
    throw new Error(json.error ?? `Request failed: ${response.status}`);
  }
  return json.data;  // <-- strips the ApiResponse envelope
};
```

The v2 API returns `{ data: T, error: null }`. `handleResponse` extracts `json.data` and returns it directly. So React Query's `data` property IS the payload — there's no extra `.data` wrapper.

**Before (with axios crud helper):**
```typescript
// Crud helper returned the full axios response
const { data, isLoading } = useFetchCheckApiKey();

if (isLoading || !data?.data) return <Skeleton />;  // double-unwrap guard
const { hasApiKey } = data.data;                     // double-unwrap access
```

**After (with getApi):**
```typescript
// getApi returns the payload directly via handleResponse
const { data, isLoading } = useFetchCheckApiKey();

if (isLoading || !data) return <Skeleton />;  // flat guard
const { hasApiKey } = data;                   // flat access
```

**What to update in consumers:**
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
4. **Verify cleanup:** Run `pnpm lint:knip` to confirm no orphaned exports remain

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
| "handleResponse" / "double unwrap" / "data.data" | See Layer 3 — envelope stripping explanation |
| "mutation hook template" / "postApi pattern" | Use `recollect-mutation-hook-refactoring` skill |
| "hard-class" / "session closure" / "QueryFunctionContext" | Not yet encoded — needs its own pathfinder first |
| "API caller migration" / "getApi pattern" | Execute the 4-layer workflow above |

## Future Classes

This skill evolves incrementally. New migration classes are added only after their pathfinder proves the pattern.

**Planned additions:**
- **postApi caller migration** — Mutation hooks using `postApi` with Zod request/response types. Will be added to THIS skill after its pathfinder completes (it's still caller migration, not mutation-hook-template refactoring).
- **Hard-class migration** — 31 axios callers with session closures, `QueryFunctionContext`, and complex type casts. Requires its own pathfinder to establish the pattern before encoding.

Do not attempt to migrate these classes until their patterns are proven and added to this skill.
