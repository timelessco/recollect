---
name: recollect-mutation-hook-refactoring
description: >
  Mutation hook template refactoring and file renaming for Recollect
  post-migration cleanup. Covers mutation-hook-template.ts restructuring,
  file renaming, and structural cleanup after API migration. Use this
  skill when the user mentions mutation hook template, file renaming,
  legacy cleanup, post-migration, or structural cleanup. For API caller
  migration (getApi/postApi patterns with Zod types), use the
  recollect-caller-migration skill instead.
disable-model-invocation: true
---

# Mutation Hook Refactoring

Handles mutation hook template refactoring and file renaming after API caller migration. For API caller migration itself (getApi and postApi patterns with Zod types), use the `recollect-caller-migration` skill.

> **Migrating API callers?** Use the `recollect-caller-migration` skill instead. It covers the 4-layer pattern: constant URL update, hook rewrite with `getApi`/`postApi` + Zod types, consumer double-unwrap removal, and dead code cleanup. This skill handles what comes AFTER — template refactoring and file renaming.

**Scope:** Mutation hooks, legacy helpers, legacy types, and file cleanup ONLY. No API route creation (the `recollect-api-migrator` agent handles that). No API caller migration (the `recollect-caller-migration` skill handles that).

## Per-Route Workflow

Execute these steps in order for each route being cleaned up. Each step prevents a specific class of dead code or broken references.

### 1. Update the Mutation Hook

Import types from the v2 route file instead of `apiTypes.ts`. Point `postApi` to the v2 URL.

```typescript
// Before
import { type LegacyPayload } from "@/types/apiTypes";
postApi<LegacyResponse>("/api/old/path", payload);

// After
import {
	type EntityPayload,
	type EntityResponse,
} from "@/app/api/v2/domain/endpoint/route";
postApi<EntityResponse>("/api/v2/domain/endpoint", payload);
```

If the v2 route uses a different payload/response shape, update the hook's optimistic updater and cache structure to match.

### 2. Update All Frontend Usage Sites

Search for every file importing the old hook:

```bash
ast-grep --lang tsx -p 'useOldHookName' src/  # Replace useOldHookName with the actual hook name
```

Update each site:

- Import the new hook
- Adjust any destructured return values
- Update payload construction if the shape changed

### 3. Remove Legacy Helper from supabaseCrudHelpers

Open `src/async/supabaseCrudHelpers/index.ts` and remove the legacy function. Remove any imports that become unused.

This prevents dead code from accumulating in the crud helpers barrel.

### 4. Remove Legacy Type from apiTypes.ts

Open `src/types/apiTypes.ts` and remove the legacy payload/response type. Types now live in the v2 route's `schema.ts`.

This ensures a single source of truth for types.

### 5. Delete Old Files

Use `trash` (never `rm`) to remove:

```bash
trash src/pages/api/{entity}/{endpoint}.ts             # Old Pages Router route
trash src/async/mutationHooks/{entity}/use{OldHook}.ts # Old mutation hook (if separate)
```

### 6. Verify

Run both checks — they catch different classes of issues:

```bash
pnpm lint:types # Catches broken imports, type mismatches
pnpm lint:knip  # Catches orphaned exports, unused code
```

Fix any issues before marking the route as complete.

## Routing Table

| User says                                          | Load this                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| "API caller migration" / "getApi pattern" / "postApi pattern" / "caller migration" | Use `recollect-caller-migration` skill |
| "update hook for [route]" / "wire up v2 [route]"   | Execute workflow above                                                       |
| "mutation hook template" / "how to structure hook" | [references/mutation-hook-template.ts](references/mutation-hook-template.ts) |
| "where is [helper/type/constant]"                  | [references/codebase-patterns.md](references/codebase-patterns.md)           |
| "cache structure" / "query keys"                   | [references/codebase-patterns.md](references/codebase-patterns.md)           |

## Error Handling Patterns to Preserve

When updating hooks, preserve these error handling patterns from the v2 routes:

**Duplicate detection (23505):** The v2 route returns `{ data: null, error: "Duplicate name" }` with status 409. Hooks should handle this in `onError` or show a toast.

**Authorization (403):** The v2 route returns `{ data: null, error: "User is not the owner" }` with status 403. Hooks should roll back optimistic updates on this.

**Server error (500):** Automatically captured by Sentry in the v2 route. Hooks should show a generic error toast.

## Common Issues

### Unused Import Warnings

After removing legacy code, ESLint flags orphaned imports:

```bash
pnpm fix:oxfmt src/async/supabaseCrudHelpers/index.ts
pnpm fix:oxfmt src/types/apiTypes.ts
```

### Knip Unused Export Warnings

New types aren't consumed yet → ensure all usage sites import from the v2 route file, not `apiTypes.ts`.

### Type Mismatches

If the v2 response shape differs from legacy (e.g., nullable fields added, phantom fields removed), update the hook's generic parameters and optimistic updater accordingly.

### Cache Key Changes

If the v2 route serves a different data shape, the React Query cache key may need updating. Check `src/utils/constants.ts` for the correct key constant.

## Success Criteria

Route cleanup is complete when:

- [ ] Mutation hook imports types from v2 route file
- [ ] Mutation hook points `postApi` to v2 URL
- [ ] All frontend usage sites updated to new hook
- [ ] Legacy helper removed from `supabaseCrudHelpers/index.ts`
- [ ] Legacy type removed from `apiTypes.ts`
- [ ] Old Pages Router file deleted with `trash`
- [ ] Old mutation hook deleted with `trash` (if applicable)
- [ ] `pnpm lint:types` passes
- [ ] `pnpm lint:knip` passes (no unused exports)
