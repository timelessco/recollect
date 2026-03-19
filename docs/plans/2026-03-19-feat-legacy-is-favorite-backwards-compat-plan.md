---
title: "feat: Legacy is_favorite backwards compatibility"
type: feat
status: completed
date: 2026-03-19
---

## Overview

Add backwards-compatible `is_favorite` boolean to legacy endpoint responses so old mobile builds continue working after PR #846 migrated favorites from `categories.is_favorite` to `profiles.favorite_categories`.

The DB schema stays as-is. `is_favorite` is computed at the API layer by checking if `category.id` exists in the authenticated user's `profiles.favorite_categories` array.

## Problem Statement

Old mobile builds expect `is_favorite` on category objects. Without it:

- **Read path:** Favorites section in sidebar renders empty
- **Write path:** Favorite toggle requests are silently ignored (Zod strips the unknown `is_favorite` field)

## Proposed Solution

Patch 3 legacy endpoints to derive `is_favorite` from `profiles.favorite_categories`. Use explicit set/unset (not toggle) on the write path for idempotency.

## Acceptance Criteria

- [x] `fetch-user-categories` returns `is_favorite: boolean` on each category object
- [x] `fetch-bookmarks-data` returns `is_favorite: boolean` on each `addedCategories` item
- [x] `update-user-category` accepts `is_favorite` in request body and updates `profiles.favorite_categories` accordingly (add if `true`, remove if `false`)
- [x] Write path is idempotent: sending `is_favorite: true` twice doesn't create duplicates
- [x] Write path works when `is_favorite` is the only field in `updateData` (no empty update sent to categories table)
- [x] `CategoriesData` type includes `is_favorite?: boolean`
- [x] No changes to App Router v2 endpoints or `toggle-favorite-category`
- [x] `pnpm fix`, `pnpm lint:types`, `pnpm lint:knip`, `pnpm build` all pass

## Implementation

### Step 1: Add `is_favorite` to `CategoriesData` type

**File:** `src/types/apiTypes.ts:159-173`

Add `is_favorite?: boolean` to the `CategoriesData` type. Optional so existing consumers that don't set it are unaffected.

### Step 2: Patch `fetch-user-categories` (read path)

**File:** `src/pages/api/category/fetch-user-categories.ts`

- Line 93-94: Expand the profile select from `"profile_pic, user_name"` to `"profile_pic, user_name, favorite_categories"`
- After the category mapping (around line 198-236), annotate each category: `is_favorite: (favoriteCategories ?? []).includes(item.id)`
- For collaborative categories (fetched separately), use the **authenticated user's** `favorite_categories`, not the category owner's

### Step 3: Patch `fetch-bookmarks-data` (read path)

**File:** `src/pages/api/bookmark/fetch-bookmarks-data.ts`

- Add a profile query early in the handler: `supabase.from("profiles").select("favorite_categories").eq("id", userId).single()` — add this to existing parallel fetches
- In the `addedCategories` mapping (lines 336-344), add `is_favorite: (favoriteCategories ?? []).includes(matchedItem.category_id.id)`

### Step 4: Patch `update-user-category` (write path)

**File:** `src/app/api/category/update-user-category/schema.ts`

- Add `is_favorite: z.boolean().optional()` to `UpdateCategoryPayloadSchema.updateData`

**File:** `src/app/api/category/update-user-category/route.ts`

- Destructure `is_favorite` from `updateData` before the Supabase `.update()` call:

  ```typescript
  const { is_favorite, ...categoryUpdateData } = updateData;
  ```

- If `is_favorite` is defined, update `profiles.favorite_categories`:
  - `true` → `array_append` with guard against duplicates:

    ```sql
    UPDATE profiles SET favorite_categories = array_append(favorite_categories, $categoryId)
    WHERE id = $userId AND NOT ($categoryId = ANY(favorite_categories))
    ```

  - `false` → `array_remove` (already idempotent):

    ```sql
    UPDATE profiles SET favorite_categories = array_remove(favorite_categories, $categoryId)
    WHERE id = $userId
    ```

- If `categoryUpdateData` is empty (only `is_favorite` was sent), skip the categories table `.update()` entirely — just return the current category row via `.select()`

### Step 5: Verification

Run the full quality gate chain:

```bash
pnpm fix
pnpm lint:types
pnpm lint:knip
pnpm build
```

## Edge Cases

| Scenario                                           | Handling                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `is_favorite: true` for already-favorited category | No-op (guard: `NOT ($id = ANY(favorite_categories))`)                                                                                                  |
| `is_favorite: false` for non-favorited category    | No-op (`array_remove` returns array unchanged)                                                                                                         |
| `is_favorite` + other fields in same request       | Both favorite update and category update execute                                                                                                       |
| `is_favorite` only, no other fields                | Skip categories table update, only update favorites array                                                                                              |
| Shared category favoriting via old build           | Not supported — old builds only had `is_favorite` on owned categories. The `.match({ user_id })` filter on the categories table already prevents this. |
| `category_id: 0` (Uncategorized)                   | Unlikely to be favorited, but `array_append`/`array_remove` handles it correctly                                                                       |

## Out of Scope

- `/api/bookmark/search-bookmarks` — also returns `addedCategories` but can be a follow-up if needed
- App Router v2 endpoints — web dashboard derives favorites client-side from profile data
- Response schema changes for `update-user-category` — no `is_favorite` in the update response
- Deprecation timeline — structured for easy removal (single type field + inline computation)

## References

- Brainstorm: `docs/brainstorms/2026-03-19-legacy-is-favorite-compat-brainstorm.md`
- Migration: `supabase/migrations/20260308135254_move_is_favorite_to_profiles.sql`
- PR #846: Migrated favorites from `categories.is_favorite` to `profiles.favorite_categories`
- `src/pageComponents/dashboard/sidePane/collectionsList.tsx:182-191` — web dashboard's client-side favorite derivation pattern
