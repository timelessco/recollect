---
title: Bookmark media classification drift
category: logic-errors
date: 2026-03-21
tags:
  - bookmarks
  - mime
  - api
  - uploads
  - supabase
---

## Bookmark media classification drift

## Problem

Bookmark media classification had drifted across server endpoints.

The list API treated media categories as `type OR meta_data.mediaType`, while search and count still used narrower `type`-only checks for images, videos, and documents.
At the same time, the upload API still trusted `request.body.type`, so unsupported client-provided MIME values could be persisted and affect downstream classification.

## Root Cause

The same domain rule existed in multiple places with no shared source of truth.

Media-category membership was duplicated across `fetch-bookmarks-data`, `search-bookmarks`, and `fetch-bookmarks-count`, so one refactor updated only part of the system.
On the upload side, accepted MIME logic existed on the client, but the server had no normalization step before persistence.

## Solution

### 1. Centralize the shared media-category predicates

Added `src/utils/bookmark-category-filters.ts`, which defines the canonical Supabase predicate strings for:

- images
- videos
- audio
- documents

It exports:

- `BOOKMARK_MEDIA_CATEGORY_PREDICATES`
- `getBookmarkMediaCategoryPredicate(categoryId)`

These predicates now back:

- `src/pages/api/bookmark/fetch-bookmarks-data.ts`
- `src/pages/api/bookmark/search-bookmarks.ts`
- `src/pages/api/bookmark/fetch-bookmarks-count.ts`

### 2. Restore list/search/count parity

Search and count now use the same media-category rule as list:

- images: `type.like.image/% OR meta_data->>mediaType.like.image/%`
- videos: `type.like.video/% OR meta_data->>mediaType.like.video/%`
- audio: `type.like.audio/% OR meta_data->>mediaType.like.audio/%`
- documents: `type.in(...) OR meta_data->>mediaType.in(...)`

This removes the user-visible contradiction where a bookmark could appear in the Images page but disappear when the user searched inside that page or checked the sidebar counts.

### 3. Normalize uploaded MIME types at the server boundary

Added `src/utils/mime.ts` with:

- `normalizeUploadedMimeType(mimeType)`

Behavior:

- lowercase accepted media MIME types before persistence
- preserve supported values
- downgrade unsupported or missing values to `bookmark`

`src/pages/api/file/upload-file.ts` now uses this normalization before inserting `type` into the database.

This keeps the trust boundary on the server and prevents unsupported client-provided MIME strings from widening bookmark classification behavior.

## Verification

Focused helper coverage:

- `pnpm exec tsx --test src/utils/bookmark-category-filters.test.ts`
- `pnpm exec tsx --test src/utils/mime.test.ts`

Focused lint:

- `pnpm exec eslint src/utils/bookmark-category-filters.ts src/utils/bookmark-category-filters.test.ts src/pages/api/bookmark/fetch-bookmarks-data.ts src/pages/api/bookmark/search-bookmarks.ts src/pages/api/bookmark/fetch-bookmarks-count.ts`
- `pnpm exec eslint src/utils/mime.ts src/utils/mime.test.ts src/pages/api/file/upload-file.ts`

Repo-wide verification run during this fix:

- `pnpm fix` passed
- `pnpm lint:knip` passed
- `pnpm lint:types` failed in unrelated existing `@base-ui/react/drawer` imports under `src/components/lightbox/*` and `src/pageComponents/dashboard/*`
- `pnpm build` failed for the same unrelated `Drawer` import issue

## Prevention

- Define category membership rules once, then import them everywhere. Do not duplicate query fragments across endpoints.
- Normalize or validate client-controlled classification fields at the server boundary before persistence.
- When widening accepted MIME behavior, verify both:
  - endpoint parity across list/search/count
  - server-side normalization or validation for persisted MIME fields
