# Legacy `is_favorite` Backwards Compatibility

**Date:** 2026-03-19
**Status:** Brainstorm
**PR Context:** #846 (migrated favorites from `categories.is_favorite` to `profiles.favorite_categories`)

## What We're Building

Add backwards-compatible `is_favorite` field to legacy endpoint responses so old mobile builds (that still expect `is_favorite` on category objects) continue to work. The DB schema stays as-is — `is_favorite` is computed at the API layer by checking if the category ID exists in the authenticated user's `profiles.favorite_categories` array.

## Why This Approach

Old app builds are already deployed and expect `is_favorite` as a boolean on category objects. Without this, the favorites UI breaks on those builds. Rather than forcing an immediate app update, we derive the value from the new schema and return it in responses.

## Affected Endpoints

### Read endpoints (return `is_favorite` in response)

1. **`/api/category/fetch-user-categories`** (Pages Router) — primary sidebar endpoint, old builds check `is_favorite` to render favorite categories
2. **`/api/bookmark/fetch-bookmarks-data`** (Pages Router) — returns `addedCategories` on bookmarks, old builds may read `is_favorite` from these

### Write endpoint (accept `is_favorite` in request)

1. **`/api/category/update-user-category`** (App Router) — old builds send `is_favorite: true/false` to toggle. Should translate this into a `profiles.favorite_categories` array update (add/remove the category ID).

## Implementation Approach

- **Read path:** After fetching categories from DB, also fetch the user's `profiles.favorite_categories` array. Map each category's `id` against the array to set `is_favorite: boolean`.
- **Write path:** In `update-user-category`, if the request body contains `is_favorite`, update `profiles.favorite_categories` accordingly (add if `true`, remove if `false`) instead of ignoring it.
- **No DB changes** — all logic is at the API layer.

## Key Decisions

- Derive `is_favorite` from `profiles.favorite_categories` (accurate per-user value, not a stub)
- Only patch Pages Router read endpoints + the update endpoint (these are what old builds call)
- No changes to App Router v2 endpoints or the new `toggle-favorite-category` endpoint
- This is a compatibility bridge — can be removed when old builds are no longer supported
