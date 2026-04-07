---
title: Replace `color:` Search Prefix With Unified `#` Syntax
type: feat
status: active
date: 2026-04-07
brainstorm: docs/brainstorms/2026-04-07-hash-color-search-syntax-brainstorm.md
---

# Replace `color:` Search Prefix With Unified `#` Syntax — Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement task-by-task. Recollect has no test suite (`pnpm test` is a no-op); verification is `pnpm fix && pnpm lint && pnpm build` plus manual checks via Scalar UI at `/api-docs`.

**Goal:** Remove `color:` from search and unify under `#`. Every `#token` is a tag candidate; `#token`s that parse as a CSS color name or hex are also color candidates. Tag results page first, then color results, deduped against bookmarks already shown in tag phase.

**Architecture:** New SQL RPC `search_bookmarks_color_array_scope` mirrors `search_bookmarks_url_tag_scope` but takes color **arrays** (multi-color AND match) and an `exclude_tag_scope` for cross-phase dedupe. The v2 search route runs tag phase first, then **fills the remainder of the page from color phase within the same request** (no short pages). Pagination switches from numeric `offset` to opaque base64url cursor `{phase, offset}`. The frontend hook page shape becomes `{items, next_cursor}`. Mutation hooks that previously used `secondaryQueryKey` migrate to `additionalOptimisticUpdates` so the search-cache updater can be search-shape-specific without forcing the primary paginated cache to change shape.

**Tech Stack:** PostgreSQL/Supabase, Next.js 16 App Router, TypeScript, Zod, ky, TanStack Query v5.

---

## Brainstorm Corrections

The brainstorm doc was written before checking the latest migration. Three corrections apply:

1. **`image_keywords.colors` is flat** — `supabase/migrations/20260406111130_flatten_colors_to_sorted_array.sql` already flattened `image_keywords.color.{primary_color, secondary_colors}` to a single `image_keywords.colors` array sorted by dominance. The new RPC reads `meta_data->'image_keywords'->'colors'`.
2. **Phase coalescing within a single request** — SpecFlow flagged that returning a short page with `next_cursor=color` stalls the intersection-observer infinite scroll. Fix: when tag phase returns fewer rows than `PAGINATION_LIMIT` and color tokens exist, the **same request** continues into the color phase until the page fills.
3. **Dedupe semantic** — "Exclude bookmarks already shown in tag phase" means _bookmarks that have ALL tagTokens_ (mirroring the tag-phase AND filter), not _bookmarks that have ANY tagToken_.

---

## File Structure

| Action | Path                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| Create | `supabase/migrations/20260407120000_search_bookmarks_color_array.sql`                 |
| Create | `src/utils/search-cursor.ts`                                                          |
| Create | `src/utils/search-tokens.ts`                                                          |
| Modify | `src/types/apiTypes.ts` (append `SearchPage` / `PaginatedSearch`)                     |
| Modify | `src/app/api/v2/bookmark/search-bookmarks/schema.ts`                                  |
| Modify | `src/app/api/v2/bookmark/search-bookmarks/route.ts`                                   |
| Modify | `src/lib/openapi/endpoints/bookmarks/v2-search-bookmarks.ts`                          |
| Delete | `src/pages/api/bookmark/search-bookmarks.ts` (orphaned, no callers in `src/`)         |
| Modify | `src/types/database-generated.types.ts` (regenerated via `pnpm db:types`)             |
| Modify | `src/async/queryHooks/bookmarks/use-search-bookmarks.ts`                              |
| Modify | `src/pageComponents/dashboard/cardSection/index.tsx` (cache reader at lines 113-121)  |
| Modify | `src/async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation.ts` |
| Modify | `src/async/mutationHooks/bookmarks/use-toggle-discoverable-optimistic-mutation.ts`    |

`PaginatedBookmarks` (the primary fetch-bookmarks-data cache type) is **not changed**. Only the search cache shape changes.

---

## Task 1: Add cursor codec utility

**Files:** Create `src/utils/search-cursor.ts`

- [ ] **Step 1.1: Create file**

```ts
/**
 * Opaque cursor for two-phase bookmark search pagination.
 * Phase 1 ("tag") scans search_bookmarks_url_tag_scope.
 * Phase 2 ("color") scans search_bookmarks_color_array_scope.
 * Wire format: base64url-encoded JSON {phase, offset}. Empty input
 * means "first page of tag phase".
 */

export type SearchPhase = "color" | "tag";

export interface SearchCursor {
  offset: number;
  phase: SearchPhase;
}

const INITIAL_CURSOR: SearchCursor = { offset: 0, phase: "tag" };

export function encodeSearchCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeSearchCursor(raw: string | undefined): SearchCursor {
  if (!raw) {
    return INITIAL_CURSOR;
  }

  let json: string;
  try {
    json = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    throw new Error("invalid cursor: not base64url");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("invalid cursor: not JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid cursor: not an object");
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.phase !== "tag" && obj.phase !== "color") {
    throw new Error("invalid cursor: phase must be 'tag' or 'color'");
  }
  if (typeof obj.offset !== "number" || !Number.isInteger(obj.offset) || obj.offset < 0) {
    throw new Error("invalid cursor: offset must be a non-negative integer");
  }

  return { offset: obj.offset, phase: obj.phase };
}
```

- [ ] **Step 1.2: Lint** — `pnpm fix:ultracite src/utils/search-cursor.ts`
- [ ] **Step 1.3: Commit** — `git add src/utils/search-cursor.ts && git commit -m "feat(search): add base64url cursor codec for two-phase pagination"`

---

## Task 2: Add token classifier utility

**Files:** Create `src/utils/search-tokens.ts`

- [ ] **Step 2.1: Create file**

```ts
import type { OklabColor } from "@/async/ai/schemas/image-analysis-schema";

import { parseSearchColor } from "@/utils/colorUtils";
import { GET_HASHTAG_TAG_PATTERN, TAG_MARKUP_REGEX } from "@/utils/constants";

export interface SearchTokens {
  colorTokens: OklabColor[];
  tagTokens: string[];
}

/**
 * Extract `#tokens` from a raw search string. Every token is a tag
 * candidate (lowercased so SQL `LOWER(name) = ANY(...)` matches).
 * Tokens that parseSearchColor accepts are also color candidates.
 */
export function classifySearchTokens(search: string): SearchTokens {
  const matches = search.match(GET_HASHTAG_TAG_PATTERN);
  if (!matches || matches.length === 0) {
    return { colorTokens: [], tagTokens: [] };
  }

  const tagTokens: string[] = [];
  const colorTokens: OklabColor[] = [];

  for (const raw of matches) {
    const markup = TAG_MARKUP_REGEX.exec(raw);
    const display = markup?.groups?.display ?? raw.replace("#", "");
    if (display.length === 0) {
      continue;
    }
    const lowered = display.toLowerCase();
    tagTokens.push(lowered);

    const parsed = parseSearchColor(lowered);
    if (parsed) {
      colorTokens.push(parsed);
    }
  }

  return { colorTokens, tagTokens };
}
```

- [ ] **Step 2.2: Lint** — `pnpm fix:ultracite src/utils/search-tokens.ts`
- [ ] **Step 2.3: Commit** — `git add src/utils/search-tokens.ts && git commit -m "feat(search): add hashtag token classifier (tag + color tokens)"`

---

## Task 3: SQL migration — color-array RPC

**Files:** Create `supabase/migrations/20260407120000_search_bookmarks_color_array.sql`

- [ ] **Step 3.1: Verify local Supabase is running** — `npx supabase status`. If not: `pnpm db:start`.

- [ ] **Step 3.2: Glob check** — `supabase/migrations/2026040*.sql`. Most recent must be `20260406111130_flatten_colors_to_sorted_array.sql`. If a newer file exists, bump the new file timestamp to one minute after the latest.

- [ ] **Step 3.3: Create migration file**

```sql
-- ============================================================================
-- Migration: Add search_bookmarks_color_array_scope() — multi-color AND
--            search RPC for the unified #-syntax bookmark search.
-- ============================================================================
-- Companion to search_bookmarks_url_tag_scope. Same RETURNS TABLE shape,
-- same text/url/category filters, same OKLAB threshold per stored color
-- position (0.30 / 0.25 / 0.18). Differences:
--   - color params are arrays: every input color must match at least one
--     stored color in image_keywords.colors within threshold (AND)
--   - exclude_tag_scope drops bookmarks that fully matched the tag phase,
--     deduping the tag → color phase transition
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.search_bookmarks_color_array_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    category_scope bigint DEFAULT NULL,
    exclude_tag_scope text[] DEFAULT NULL,
    color_l double precision[] DEFAULT NULL,
    color_a double precision[] DEFAULT NULL,
    color_b double precision[] DEFAULT NULL
)
RETURNS TABLE(
    id bigint,
    user_id uuid,
    inserted_at timestamp with time zone,
    title extensions.citext,
    url text,
    description text,
    ogimage text,
    screenshot text,
    trash timestamp with time zone,
    type text,
    meta_data jsonb,
    sort_index text,
    added_tags jsonb,
    added_categories jsonb,
    make_discoverable timestamp with time zone
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, extensions
AS $function$
BEGIN
    SET LOCAL pg_trgm.similarity_threshold = 0.6;

    IF color_l IS NULL OR array_length(color_l, 1) IS NULL THEN
        RETURN;
    END IF;

    IF array_length(color_l, 1) <> array_length(color_a, 1)
       OR array_length(color_l, 1) <> array_length(color_b, 1) THEN
        RAISE EXCEPTION 'color_l/color_a/color_b length mismatch';
    END IF;

    RETURN QUERY
    WITH
    bookmark_tags_agg AS (
        SELECT
            bt.bookmark_id,
            bt.user_id,
            jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)) AS tags_json
        FROM public.bookmark_tags bt
        JOIN public.tags t ON t.id = bt.tag_id
        GROUP BY bt.bookmark_id, bt.user_id
    ),
    bookmark_cats_agg AS (
        SELECT
            bc.bookmark_id,
            bc.user_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'category_name', c.category_name,
                    'category_slug', c.category_slug,
                    'icon', c.icon,
                    'icon_color', c.icon_color
                )
                ORDER BY bc.created_at ASC
            ) AS categories_json
        FROM public.bookmark_categories bc
        JOIN public.categories c ON c.id = bc.category_id
        GROUP BY bc.bookmark_id, bc.user_id
    )
    SELECT
        b.id, b.user_id, b.inserted_at, b.title, b.url, b.description,
        b."ogImage", b.screenshot, b.trash, b.type, b.meta_data, b.sort_index,
        COALESCE(bta.tags_json, '[]'::jsonb) AS added_tags,
        COALESCE(bca.categories_json, '[]'::jsonb) AS added_categories,
        b.make_discoverable
    FROM public.everything b
    LEFT JOIN bookmark_tags_agg bta ON bta.bookmark_id = b.id AND bta.user_id = b.user_id
    LEFT JOIN bookmark_cats_agg bca ON bca.bookmark_id = b.id AND bca.user_id = b.user_id
    WHERE
        -- URL scope (mirrors tag RPC)
        (
            url_scope IS NULL OR url_scope = ''
            OR b.url ILIKE '%' || url_scope || '%'
        )
        AND
        -- Category scope (mirrors tag RPC)
        (
            category_scope IS NULL
            OR EXISTS (
                SELECT 1 FROM public.bookmark_categories bc
                WHERE bc.bookmark_id = b.id AND bc.category_id = category_scope
            )
        )
        AND
        -- Plain text (mirrors tag RPC verbatim)
        (
            search_text IS NULL OR btrim(search_text) = ''
            OR NOT EXISTS (
                SELECT 1
                FROM unnest(string_to_array(lower(btrim(search_text)), ' ')) AS token
                WHERE token <> ''
                  AND NOT (
                    token % ANY(
                        string_to_array(
                            lower(COALESCE(b.title::text, '') || ' ' || COALESCE(b.description, '')),
                            ' '
                        )
                    )
                    OR lower(COALESCE(b.url, '')) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    OR EXISTS (
                        SELECT 1 FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
                        WHERE key IN ('img_caption', 'image_caption', 'ocr')
                          AND lower(value) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    )
                    OR EXISTS (
                        SELECT 1 FROM public.extract_keywords_text(b.meta_data->'image_keywords') AS kw
                        WHERE lower(kw.keyword) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    )
                  )
            )
        )
        AND
        -- Tag-phase dedupe: drop bookmarks that fully matched the tag phase
        -- (would have appeared via search_bookmarks_url_tag_scope with tag_scope = exclude_tag_scope)
        (
            exclude_tag_scope IS NULL OR array_length(exclude_tag_scope, 1) IS NULL
            OR (
                SELECT COUNT(DISTINCT LOWER(t.name))
                FROM public.bookmark_tags bt
                JOIN public.tags t ON t.id = bt.tag_id
                WHERE bt.bookmark_id = b.id
                  AND LOWER(t.name) = ANY(SELECT LOWER(unnest(exclude_tag_scope)))
            ) < (
                SELECT COUNT(DISTINCT LOWER(tag)) FROM unnest(exclude_tag_scope) AS tag
            )
        )
        AND
        -- Multi-color AND: every input color must hit at least one stored color
        (
            SELECT bool_and(matched)
            FROM (
                SELECT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(
                        COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
                    ) WITH ORDINALITY AS c(val, pos)
                    WHERE
                        CASE WHEN SQRT(POWER(color_a[i], 2) + POWER(color_b[i], 2)) < 0.04 THEN
                            SQRT(POWER((c.val->>'a')::float, 2) + POWER((c.val->>'b')::float, 2)) < 0.04
                            AND ABS(color_l[i] - (c.val->>'l')::float) < 0.15
                        ELSE
                            SQRT(
                                POWER(color_l[i] - (c.val->>'l')::float, 2) +
                                POWER(color_a[i] - (c.val->>'a')::float, 2) +
                                POWER(color_b[i] - (c.val->>'b')::float, 2)
                            ) < CASE
                                WHEN c.pos = 1 THEN 0.30
                                WHEN c.pos = 2 THEN 0.25
                                ELSE 0.18
                            END
                        END
                ) AS matched
                FROM generate_series(1, array_length(color_l, 1)) AS i
            ) AS color_matches
        )
    ORDER BY
        -- Text similarity (mirrors tag RPC)
        CASE
            WHEN search_text IS NULL OR btrim(search_text) = '' THEN 0
            ELSE (
                similarity(COALESCE(b.url, ''), btrim(search_text)) * 0.6 +
                similarity(COALESCE(b.title::text, ''), btrim(search_text)) * 0.5 +
                similarity(COALESCE(b.description, ''), btrim(search_text)) * 0.3 +
                similarity(COALESCE(b.meta_data->>'ocr', ''), btrim(search_text)) * 0.1 +
                similarity(COALESCE(b.meta_data->>'img_caption', ''), btrim(search_text)) * 0.15 +
                similarity(COALESCE(b.meta_data->>'image_caption', ''), btrim(search_text)) * 0.15 +
                similarity(
                    COALESCE(
                        (SELECT string_agg(kw.keyword, ' ') FROM public.extract_keywords_text(b.meta_data->'image_keywords') AS kw),
                        ''
                    ),
                    btrim(search_text)
                ) * 0.1
            )
        END +
        -- Multi-color score: SUM across input colors of best per-color contribution.
        -- Per-color contribution = MAX over stored colors of (1 - distance) * (1/pos),
        -- gated by the same per-position threshold used in the WHERE clause.
        COALESCE(
            (
                SELECT SUM(per_color_score)
                FROM (
                    SELECT (
                        SELECT MAX(
                            CASE WHEN SQRT(POWER(color_a[i], 2) + POWER(color_b[i], 2)) < 0.04 THEN
                                CASE WHEN SQRT(POWER((c.val->>'a')::float, 2) + POWER((c.val->>'b')::float, 2)) < 0.04
                                  AND ABS(color_l[i] - (c.val->>'l')::float) < 0.15
                                THEN (1.0 - ABS(color_l[i] - (c.val->>'l')::float)) * (1.0 / c.pos)
                                ELSE 0 END
                            ELSE
                                CASE WHEN SQRT(
                                    POWER(color_l[i] - (c.val->>'l')::float, 2) +
                                    POWER(color_a[i] - (c.val->>'a')::float, 2) +
                                    POWER(color_b[i] - (c.val->>'b')::float, 2)
                                ) < CASE
                                    WHEN c.pos = 1 THEN 0.30
                                    WHEN c.pos = 2 THEN 0.25
                                    ELSE 0.18
                                END
                                THEN GREATEST(0, 1.0 - SQRT(
                                    POWER(color_l[i] - (c.val->>'l')::float, 2) +
                                    POWER(color_a[i] - (c.val->>'a')::float, 2) +
                                    POWER(color_b[i] - (c.val->>'b')::float, 2)
                                )) * (1.0 / c.pos)
                                ELSE 0 END
                            END
                        )
                        FROM jsonb_array_elements(
                            COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
                        ) WITH ORDINALITY AS c(val, pos)
                    ) AS per_color_score
                    FROM generate_series(1, array_length(color_l, 1)) AS i
                ) AS scores
            ),
            0
        )
        DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_color_array_scope(character varying, character varying, bigint, text[], double precision[], double precision[], double precision[]) IS
'Multi-color AND search for unified #-syntax. Companion to search_bookmarks_url_tag_scope. Each input color (i) must match at least one stored color in image_keywords.colors within positional OKLAB threshold (index 1: 0.30, index 2: 0.25, index 3+: 0.18). exclude_tag_scope drops bookmarks that fully match the tag-phase AND filter, deduping between phases. Score = text similarity + sum of per-input-color positional contributions; tiebreaker inserted_at DESC.';

DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'search_bookmarks_color_array_scope';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected 1 search_bookmarks_color_array_scope, found %', v_count;
  END IF;
  RAISE NOTICE 'search_bookmarks_color_array_scope created';
END $$;

COMMIT;
```

- [ ] **Step 3.4: Apply migration** — `pnpm db:reset` (per `gotchas.md`: always reset before regenerating types). Confirm `RAISE NOTICE 'search_bookmarks_color_array_scope created'` in output.

- [ ] **Step 3.5: Regenerate types** — `pnpm db:types`. Then Grep `search_bookmarks_color_array_scope` in `src/types/database-generated.types.ts`. Expected: at least one match (the generated function signature).

- [ ] **Step 3.6: Commit** — `git add supabase/migrations/20260407120000_search_bookmarks_color_array.sql src/types/database-generated.types.ts && git commit -m "feat(db): add search_bookmarks_color_array_scope for multi-color AND search"`

---

## Task 4: Add `SearchPage` types and update Zod schemas

**Files:** Modify `src/types/apiTypes.ts`, replace `src/app/api/v2/bookmark/search-bookmarks/schema.ts`

- [ ] **Step 4.1: Append to `src/types/apiTypes.ts`** (after the existing `PaginatedBookmarks` definition — Grep `PaginatedBookmarks` to find it):

```ts
/**
 * Single page of search results returned by the v2 search-bookmarks route.
 * Wraps the items array with an opaque next-cursor string for two-phase
 * cursor pagination (tag → color). `next_cursor` is null when both phases
 * are exhausted. Distinct from `PaginatedBookmarks` (bare arrays + offset).
 */
export interface SearchPage {
  items: SingleListData[];
  next_cursor: null | string;
}

export interface PaginatedSearch {
  pageParams: (string | undefined)[];
  pages: SearchPage[];
}
```

- [ ] **Step 4.2: Replace `src/app/api/v2/bookmark/search-bookmarks/schema.ts`**

```ts
import { z } from "zod";

export const SearchBookmarksInputSchema = z.object({
  category_id: z.string().optional().meta({
    description:
      "Category context — DISCOVER_URL for public search, numeric string for user category, or special URL like TRASH_URL",
  }),
  cursor: z.string().optional().default("").meta({
    description:
      "Opaque pagination cursor from a previous response's next_cursor. Empty (or omitted) returns the first page. Treat as opaque — internal shape is base64url JSON {phase, offset}.",
  }),
  search: z.string().min(1, "Search parameter is required").meta({
    description:
      "Search query — supports @domain.com site scope and #tag/#color filters. Each #token is a tag candidate; tokens that parse as a CSS color name or hex are also color candidates (multi-color is AND).",
  }),
});

export type SearchBookmarksInput = z.infer<typeof SearchBookmarksInputSchema>;

const SearchBookmarkItemSchema = z.object({
  addedCategories: z.unknown().nullable().meta({
    description: "Categories the bookmark belongs to (camelCase mapped from added_categories)",
  }),
  addedTags: z.unknown().nullable().meta({
    description: "Tags associated with the bookmark (camelCase mapped from added_tags)",
  }),
  description: z.string().nullable().meta({ description: "Bookmark description" }),
  id: z.int().meta({ description: "Bookmark ID" }),
  inserted_at: z.string().nullable().meta({ description: "Created timestamp" }),
  make_discoverable: z.string().nullable().meta({ description: "Discover page visibility flag" }),
  meta_data: z.unknown().nullable().meta({ description: "Bookmark metadata JSON" }),
  ogImage: z.string().nullable().meta({ description: "Open Graph image (camelCase from ogimage)" }),
  screenshot: z.string().nullable().meta({ description: "Screenshot image URL" }),
  sort_index: z.string().nullable().meta({ description: "Sort index for ordering" }),
  title: z.string().nullable().meta({ description: "Bookmark title" }),
  trash: z.unknown().nullable().meta({ description: "Trash status — null if not trashed" }),
  type: z.string().nullable().meta({ description: "Bookmark type" }),
  url: z.string().nullable().meta({ description: "Bookmark URL" }),
  user_id: z.string().nullable().meta({ description: "Owner user ID" }),
});

export const SearchBookmarksOutputSchema = z
  .object({
    items: z.array(SearchBookmarkItemSchema).meta({
      description:
        "Result items for this page. May contain a mix of tag-phase and color-phase rows when the tag phase exhausts mid-page.",
    }),
    next_cursor: z.string().nullable().meta({
      description: "Cursor for the next page, or null when both phases are exhausted.",
    }),
  })
  .meta({
    description: "Paginated search results with opaque cursor for the two-phase tag→color stream",
  });

export type SearchBookmarksOutput = z.infer<typeof SearchBookmarksOutputSchema>;
```

- [ ] **Step 4.3: Lint** — `pnpm fix:ultracite src/app/api/v2/bookmark/search-bookmarks/schema.ts src/types/apiTypes.ts`
- [ ] **Step 4.4: Commit** — `git add src/app/api/v2/bookmark/search-bookmarks/schema.ts src/types/apiTypes.ts && git commit -m "feat(search): add cursor input + envelope output schemas for v2 search"`

---

## Task 5: Refactor v2 search route handler

**Files:** Replace `src/app/api/v2/bookmark/search-bookmarks/route.ts`

The handler decodes cursor → classifies tokens → runs tag phase → coalesces into color phase if tag phase under-fills → encodes next cursor → returns envelope.

- [ ] **Step 5.1: Replace the route**

```ts
import { NextResponse } from "next/server";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createApiClient, getApiUser } from "@/lib/supabase/api";
import { getBookmarkMediaCategoryPredicate } from "@/utils/bookmark-category-filters";
import { isUserOwnerOrAnyCollaborator } from "@/utils/category-auth";
import {
  AUDIO_URL,
  bookmarkType,
  DISCOVER_URL,
  DOCUMENTS_URL,
  GET_HASHTAG_TAG_PATTERN,
  GET_SITE_SCOPE_PATTERN,
  IMAGES_URL,
  instagramType,
  INSTAGRAM_URL,
  LINKS_URL,
  PAGINATION_LIMIT,
  TRASH_URL,
  tweetType,
  TWEETS_URL,
  UNCATEGORIZED_URL,
  VIDEOS_URL,
} from "@/utils/constants";
import { decodeSearchCursor, encodeSearchCursor } from "@/utils/search-cursor";
import { classifySearchTokens } from "@/utils/search-tokens";

import type { SearchCursor } from "@/utils/search-cursor";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SearchBookmarksInputSchema, SearchBookmarksOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-search-bookmarks";

const SPECIAL_CATEGORY_URLS = new Set([
  AUDIO_URL,
  DOCUMENTS_URL,
  IMAGES_URL,
  INSTAGRAM_URL,
  LINKS_URL,
  TRASH_URL,
  TWEETS_URL,
  UNCATEGORIZED_URL,
  VIDEOS_URL,
]);

function isUserCollection(categoryId: string): boolean {
  return categoryId !== "null" && categoryId !== "" && !SPECIAL_CATEGORY_URLS.has(categoryId);
}

interface PhaseParams {
  categoryId: null | string | undefined;
  categoryScope: number | undefined;
  isDiscoverPage: boolean;
  isTrashPage: boolean;
  searchText: string;
  urlScope: string;
  userId: string;
  userInCollections: boolean;
}

// oxlint-disable-next-line @typescript-eslint/no-explicit-any
function applySharedFilters(query: any, params: PhaseParams) {
  let q = query;
  q = params.isTrashPage ? q.not("trash", "is", null) : q.is("trash", null);

  if (params.isDiscoverPage) {
    return q.not("make_discoverable", "is", null);
  }
  if (!params.userInCollections) {
    q = q.filter("user_id", "eq", params.userId);
  }
  if (params.categoryId === TWEETS_URL) {
    q = q.filter("type", "eq", tweetType);
  }
  if (params.categoryId === INSTAGRAM_URL) {
    q = q.filter("type", "eq", instagramType);
  }
  if (params.categoryId === LINKS_URL) {
    q = q.filter("type", "eq", bookmarkType);
  }
  const mediaCategoryPredicate = getBookmarkMediaCategoryPredicate(params.categoryId);
  if (mediaCategoryPredicate) {
    q = q.or(mediaCategoryPredicate);
  }
  return q;
}

async function runTagPhase(args: {
  limit: number;
  offset: number;
  params: PhaseParams;
  supabase: SupabaseClient;
  tagTokens: string[];
}) {
  const { limit, offset, params, supabase, tagTokens } = args;
  let rpcQuery = supabase
    .rpc("search_bookmarks_url_tag_scope", {
      category_scope: params.isDiscoverPage ? undefined : params.categoryScope,
      color_a: undefined,
      color_b: undefined,
      color_l: undefined,
      search_text: params.searchText,
      tag_scope: tagTokens.length > 0 ? tagTokens : undefined,
      url_scope: params.urlScope,
    })
    .range(offset, offset + limit - 1);

  rpcQuery = applySharedFilters(rpcQuery, params);
  const { data, error } = await rpcQuery;
  if (error) {
    throw new RecollectApiError("service_unavailable", {
      cause: error,
      message: "Error executing tag-phase search",
      operation: "search_bookmarks_tag_phase",
    });
  }
  return (data ?? []) as unknown[];
}

async function runColorPhase(args: {
  colorTokens: { a: number; b: number; l: number }[];
  excludeTagScope: string[];
  limit: number;
  offset: number;
  params: PhaseParams;
  supabase: SupabaseClient;
}) {
  const { colorTokens, excludeTagScope, limit, offset, params, supabase } = args;
  let rpcQuery = supabase
    .rpc("search_bookmarks_color_array_scope", {
      category_scope: params.isDiscoverPage ? undefined : params.categoryScope,
      color_a: colorTokens.map((c) => c.a),
      color_b: colorTokens.map((c) => c.b),
      color_l: colorTokens.map((c) => c.l),
      exclude_tag_scope: excludeTagScope.length > 0 ? excludeTagScope : undefined,
      search_text: params.searchText,
      url_scope: params.urlScope,
    })
    .range(offset, offset + limit - 1);

  rpcQuery = applySharedFilters(rpcQuery, params);
  const { data, error } = await rpcQuery;
  if (error) {
    throw new RecollectApiError("service_unavailable", {
      cause: error,
      message: "Error executing color-phase search",
      operation: "search_bookmarks_color_phase",
    });
  }
  return (data ?? []) as unknown[];
}

function mapRow(row: unknown) {
  const r = row as Record<string, unknown>;
  const { added_categories, added_tags, ogimage, ...rest } = r;
  return {
    ...rest,
    addedCategories: added_categories ?? null,
    addedTags: added_tags ?? null,
    ogImage: ogimage ?? null,
  };
}

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const { category_id: categoryId, cursor: rawCursor, search } = input;
      const isDiscoverPage = categoryId === DISCOVER_URL;

      let supabase: SupabaseClient;
      let userId = "";
      let userEmail = "";

      if (isDiscoverPage) {
        const client = await createApiClient();
        supabase = client.supabase;
      } else {
        const { supabase: sc, token } = await createApiClient();
        const {
          data: { user },
          error: userError,
        } = await getApiUser(sc, token);
        if (userError) {
          throw new RecollectApiError("unauthorized", { message: userError.message });
        }
        if (!user) {
          throw new RecollectApiError("unauthorized", { message: "Not authenticated" });
        }
        supabase = sc;
        userId = user.id;
        userEmail = user.email ?? "";

        const alsCtx = getServerContext();
        if (alsCtx) {
          alsCtx.user_id = userId;
        }
      }

      let cursor: SearchCursor;
      try {
        cursor = decodeSearchCursor(rawCursor);
      } catch (error) {
        throw new RecollectApiError("bad_request", {
          cause: error instanceof Error ? error : undefined,
          message: error instanceof Error ? error.message : "invalid cursor",
          operation: "search_bookmarks_decode_cursor",
        });
      }

      const matchedSiteScope = search.match(GET_SITE_SCOPE_PATTERN);
      const urlScope = matchedSiteScope?.at(0)?.replace("@", "")?.toLowerCase() ?? "";

      const { colorTokens, tagTokens } = classifySearchTokens(search);

      const searchText = search
        .replace(GET_SITE_SCOPE_PATTERN, "")
        .replace(GET_HASHTAG_TAG_PATTERN, "")
        .trim();

      // Stale cursor recovery: if client says color phase but tokenization
      // has no color tokens (search query changed under them), reset to tag.
      if (cursor.phase === "color" && colorTokens.length === 0) {
        cursor = { offset: 0, phase: "tag" };
      }

      const userInCollections = isUserCollection(categoryId ?? "");
      let categoryScope: number | undefined;
      if (userInCollections) {
        categoryScope = categoryId === UNCATEGORIZED_URL ? 0 : Number(categoryId);
      }

      if (!isDiscoverPage && userInCollections && categoryScope !== undefined) {
        const hasAccess = await isUserOwnerOrAnyCollaborator({
          categoryId: categoryScope,
          email: userEmail,
          supabase,
          userId,
        });
        if (!hasAccess) {
          // Non-collaborators see only their own bookmarks via applySharedFilters
        }
      }

      const params: PhaseParams = {
        categoryId,
        categoryScope,
        isDiscoverPage,
        isTrashPage: categoryId === TRASH_URL,
        searchText,
        urlScope,
        userId,
        userInCollections,
      };

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.is_discover = isDiscoverPage;
        ctx.fields.category_id = categoryId;
        ctx.fields.cursor_phase = cursor.phase;
        ctx.fields.cursor_offset = cursor.offset;
        ctx.fields.tag_token_count = tagTokens.length;
        ctx.fields.color_token_count = colorTokens.length;
        ctx.fields.search_text = searchText || null;
        ctx.fields.url_scope = urlScope || null;
      }

      const items: unknown[] = [];
      let nextCursor: null | string = null;

      // Phase 1: tag phase. Always runs in tag phase even if tagTokens is
      // empty — it serves the plain text + URL/category scope path.
      if (cursor.phase === "tag") {
        const tagResults = await runTagPhase({
          limit: PAGINATION_LIMIT,
          offset: cursor.offset,
          params,
          supabase,
          tagTokens,
        });
        items.push(...tagResults);

        if (tagResults.length === PAGINATION_LIMIT) {
          nextCursor = encodeSearchCursor({
            offset: cursor.offset + tagResults.length,
            phase: "tag",
          });
        } else if (colorTokens.length > 0) {
          // Coalesce: tag phase under-filled, drop into color phase in same request
          cursor = { offset: 0, phase: "color" };
        } else {
          nextCursor = null;
        }
      }

      // Phase 2: color phase (initial entry OR continuation from tag phase)
      if (nextCursor === null && cursor.phase === "color" && colorTokens.length > 0) {
        const remaining = PAGINATION_LIMIT - items.length;
        const colorResults = await runColorPhase({
          colorTokens,
          excludeTagScope: tagTokens,
          limit: remaining,
          offset: cursor.offset,
          params,
          supabase,
        });
        items.push(...colorResults);

        nextCursor =
          colorResults.length === remaining
            ? encodeSearchCursor({
                offset: cursor.offset + colorResults.length,
                phase: "color",
              })
            : null;
      }

      if (ctx?.fields) {
        ctx.fields.results_count = items.length;
        ctx.fields.next_cursor_present = nextCursor !== null;
      }

      const mappedItems = items.map(mapRow);

      // NextResponse escape hatch: items contain dynamic RPC columns
      return NextResponse.json({ items: mappedItems, next_cursor: nextCursor });
    },
    inputSchema: SearchBookmarksInputSchema,
    outputSchema: SearchBookmarksOutputSchema,
    route: ROUTE,
  }),
);
```

- [ ] **Step 5.2: Lint + build** — `pnpm fix:ultracite src/app/api/v2/bookmark/search-bookmarks/route.ts && pnpm build`
- [ ] **Step 5.3: Manual smoke (Scalar UI at `/api-docs`)** — try: `#typescript`, `#blue`, `#ff0000`, `#red #blue`, `react`, `react #blue`. Verify response shape `{items, next_cursor}`.
- [ ] **Step 5.4: Commit** — `git add src/app/api/v2/bookmark/search-bookmarks/route.ts && git commit -m "feat(search): two-phase tag→color v2 search with cursor pagination"`

---

## Task 6: Update OpenAPI supplement

**Files:** Replace `src/lib/openapi/endpoints/bookmarks/v2-search-bookmarks.ts`

- [ ] **Step 6.1: Replace file**

```ts
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2SearchBookmarksSupplement = {
  additionalResponses: {
    400: { description: "Missing or invalid search query parameter, or malformed cursor" },
    401: { description: "Authentication required for non-discover page searches" },
  },
  description:
    "Searches bookmarks via two-phase RPCs: search_bookmarks_url_tag_scope (tag phase) then search_bookmarks_color_array_scope (color phase). Every #token is a tag candidate; tokens that parse as a CSS color name or hex are also color candidates. Pagination is opaque cursor-based — pass back next_cursor from the previous response. Auth is conditional: discover page is public, all other contexts require auth.",
  method: "get",
  parameterExamples: {
    category_id: {
      "discover-page": {
        description: "Use the discover category ID for public search.",
        summary: "Public discover page search",
        value: "discover",
      },
      "user-category": {
        description: "Numeric category ID for auth-scoped search within a collection.",
        summary: "Search within user category",
        value: "42",
      },
    },
    cursor: {
      "first-page": {
        description: "Empty (or omitted) returns the first page.",
        summary: "First page",
        value: "",
      },
      "next-page": {
        description: "Pass back the next_cursor value from the previous response. Treat as opaque.",
        summary: "Subsequent page",
        value: "eyJwaGFzZSI6InRhZyIsIm9mZnNldCI6MjB9",
      },
    },
    search: {
      "hash-color-name": {
        description:
          "Color search by name. If a tag with the same name exists, tag results page first.",
        summary: "Color by name",
        value: "#blue",
      },
      "hash-hex": {
        description:
          "Color search by hex. Tag query for the literal name 'ff0000' also runs (typically empty).",
        summary: "Color by hex",
        value: "#ff0000",
      },
      "hashtag-filter": {
        description: "Plain tag — token is not a CSS color so the color phase is skipped.",
        summary: "Tag filter",
        value: "#typescript",
      },
      "multi-color-and": {
        description: "Two or more #color tokens are an AND match — all colors must be present.",
        summary: "Multi-color AND",
        value: "#red #blue",
      },
      "site-scope": {
        description: "Prefix with @ to scope search to a specific domain.",
        summary: "Site scope",
        value: "@github.com react hooks",
      },
      "text-search": {
        description: "Plain text search across titles, descriptions, and URLs.",
        summary: "Basic text search",
        value: "react hooks",
      },
    },
  },
  path: "/v2/bookmark/search-bookmarks",
  response400Examples: {
    "invalid-cursor": {
      description: "Send a malformed cursor — returns 400.",
      summary: "Invalid cursor",
      value: { error: "invalid cursor: not base64url" } as const,
    },
    "missing-search": {
      description: "Send without search — returns 400.",
      summary: "Missing search",
      value: { error: "Search parameter is required" } as const,
    },
  },
  responseExamples: {
    "final-page": {
      description: "Final page — next_cursor is null.",
      summary: "Final page",
      value: { items: [], next_cursor: null } as const,
    },
    "search-results": {
      description: "Matching bookmarks with camelCase mapping. next_cursor is opaque.",
      summary: "Search results page",
      value: {
        items: [
          {
            addedCategories: null,
            addedTags: null,
            description: "A guide to React hooks",
            id: 123,
            inserted_at: "2025-01-15T10:30:00+00:00",
            make_discoverable: null,
            meta_data: {},
            ogImage: "https://example.com/og-image.jpg",
            screenshot: null,
            sort_index: "0",
            title: "React Hooks Guide",
            trash: null,
            type: "bookmark",
            url: "https://example.com/react-hooks",
            user_id: "user-uuid-123",
          },
        ],
        next_cursor: "eyJwaGFzZSI6InRhZyIsIm9mZnNldCI6MjB9",
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Search bookmarks with cursor pagination (two-phase tag → color)",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
```

- [ ] **Step 6.2: Regenerate OpenAPI** — `npx tsx scripts/generate-openapi.ts`. Grep `next_cursor` in `public/openapi.json` (note: gitignored, expected).
- [ ] **Step 6.3: Lint** — `pnpm fix:ultracite src/lib/openapi/endpoints/bookmarks/v2-search-bookmarks.ts`
- [ ] **Step 6.4: Commit** — `git add src/lib/openapi/endpoints/bookmarks/v2-search-bookmarks.ts && git commit -m "docs(openapi): document cursor + #-color examples for v2 search"`

---

## Task 7: Delete orphaned v1 search route

**Files:** Delete `src/pages/api/bookmark/search-bookmarks.ts`

- [ ] **Step 7.1: Re-verify zero callers** — Grep `from.*pages/api/bookmark/search-bookmarks` in `src`. Expected: no matches. Grep `bookmark/search-bookmarks` in `src` excluding `app/api/v2`, `lib/openapi`, `utils/constants.ts` — expected: only the file itself.
- [ ] **Step 7.2: Delete** — `git rm src/pages/api/bookmark/search-bookmarks.ts`
- [ ] **Step 7.3: Build** — `pnpm build`. If failing, an importer was missed; revert and update Step 7.1.
- [ ] **Step 7.4: Commit** — `git commit -m "chore(search): delete orphaned v1 search-bookmarks Pages Router route"`

---

## Task 8: Wire `useSearchBookmarks` to cursor pagination

**Files:** Replace `src/async/queryHooks/bookmarks/use-search-bookmarks.ts`

- [ ] **Step 8.1: Replace file**

```ts
import { useEffect, useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";
import { isEmpty } from "lodash";

import type { SearchPage, SingleListData } from "@/types/apiTypes";

import { buildSearchCategorySegment } from "@/hooks/use-bookmark-mutation-context";
import useGetCurrentCategoryId from "@/hooks/useGetCurrentCategoryId";
import { api } from "@/lib/api-helpers/api-v2";
import { useLoadersStore, useMiscellaneousStore, useSupabaseSession } from "@/store/componentStore";
import { isNonNullable } from "@/utils/assertion-utils";
import { BOOKMARKS_KEY, V2_SEARCH_BOOKMARKS_API } from "@/utils/constants";

interface UseSearchBookmarksOptions {
  enabled?: boolean;
}

export default function useSearchBookmarks(options: UseSearchBookmarksOptions = {}) {
  const { enabled = true } = options;
  const searchText = useMiscellaneousStore((state) => state.searchText);
  const session = useSupabaseSession((state) => state.session);
  const toggleIsSearchLoading = useLoadersStore((state) => state.toggleIsSearchLoading);
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    enabled: enabled && !isEmpty(searchText),
    queryFn: async ({ pageParam }) => {
      const response = await api
        .get(V2_SEARCH_BOOKMARKS_API, {
          searchParams: {
            category_id: String(CATEGORY_ID ?? "null"),
            cursor: pageParam,
            search: searchText ?? "",
          },
        })
        .json<{ items: SingleListData[]; next_cursor: null | string }>();
      const page: SearchPage = { items: response.items, next_cursor: response.next_cursor };
      return page;
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    queryKey: [
      BOOKMARKS_KEY,
      session?.user?.id,
      buildSearchCategorySegment(CATEGORY_ID),
      searchText,
    ] as const,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isEmpty(searchText)) {
      toggleIsSearchLoading(isLoading);
    } else {
      toggleIsSearchLoading(false);
    }
  }, [toggleIsSearchLoading, isLoading, searchText]);

  return {
    data,
    fetchNextPage,
    flattenedSearchData: useMemo(
      () => data?.pages?.flatMap((p) => p.items).filter(isNonNullable) ?? [],
      [data],
    ),
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
    isLoading,
  };
}
```

(`PAGINATION_LIMIT` import is removed — cursor handles pagination state.)

- [ ] **Step 8.2: Lint + build** — `pnpm fix:ultracite src/async/queryHooks/bookmarks/use-search-bookmarks.ts && pnpm build`
- [ ] **Step 8.3: Commit** — `git add src/async/queryHooks/bookmarks/use-search-bookmarks.ts && git commit -m "feat(search): wire useSearchBookmarks to cursor pagination"`

---

## Task 9: Update cardSection cache reader

**Files:** Modify `src/pageComponents/dashboard/cardSection/index.tsx` (around lines 113-121)

- [ ] **Step 9.1: Update import** — change the existing `PaginatedBookmarks` import from `@/types/apiTypes` to import `PaginatedSearch` (keep other names that are already imported from this module).

- [ ] **Step 9.2: Replace cache reader block** (around lines 113-121):

```ts
// search cache uses the SearchPage envelope shape ({items, next_cursor})
const searchBookmarksData = queryClient.getQueryData<PaginatedSearch>([
  BOOKMARKS_KEY,
  userId,
  buildSearchCategorySegment(categoryId),
  searchText,
]);

const bookmarksList =
  isPublicPage || isEmpty(searchText)
    ? listData
    : (searchBookmarksData?.pages?.flatMap((p) => p.items) ?? []);
```

- [ ] **Step 9.3: Lint + build** — `pnpm fix:ultracite src/pageComponents/dashboard/cardSection/index.tsx && pnpm build`
- [ ] **Step 9.4: Commit** — `git add src/pageComponents/dashboard/cardSection/index.tsx && git commit -m "feat(search): read SearchPage envelope in cardSection cache"`

---

## Task 10: Migrate move-to-trash mutation to envelope-aware updater

**Files:** Replace `src/async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation.ts`

The current code passes `secondaryQueryKey: searchQueryKey` and reuses the primary `updater` (which assumes `PaginatedBookmarks`). With the new `SearchPage` shape that updater would corrupt the search cache. Move the search update into `additionalOptimisticUpdates` with a `SearchPage`-aware updater. The broad invalidation in `onSettled` (`[BOOKMARKS_KEY, userId]`) prefix-matches both caches.

- [ ] **Step 10.1: Replace file**

```ts
import { produce } from "immer";

import type {
  MoveBookmarkToTrashApiPayload,
  PaginatedBookmarks,
  PaginatedSearch,
} from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  TRASH_URL,
  UNCATEGORIZED_URL,
} from "@/utils/constants";

import { moveBookmarkToTrash } from "../../supabaseCrudHelpers";

export const useMoveBookmarkToTrashOptimisticMutation = () => {
  const { queryClient, queryKey, searchQueryKey, session, sortBy } = useBookmarkMutationContext();

  const moveBookmarkToTrashOptimisticMutation = useReactQueryOptimisticMutation<
    unknown,
    Error,
    MoveBookmarkToTrashApiPayload,
    typeof queryKey,
    PaginatedBookmarks
  >({
    additionalOptimisticUpdates: [
      // Destination cache (trash page or restored category page)
      {
        getQueryKey: (variables) => {
          if (variables.isTrash) {
            return [BOOKMARKS_KEY, session?.user?.id, TRASH_URL, sortBy];
          }
          const [firstBookmark] = variables.data;
          const categoryIds = firstBookmark?.addedCategories?.map((cat) => cat.id) ?? [];
          const targetCategoryId = categoryIds.length > 0 ? categoryIds[0] : UNCATEGORIZED_URL;
          return [BOOKMARKS_KEY, session?.user?.id, targetCategoryId, sortBy];
        },
        updater: (destinationData, variables) => {
          const data = destinationData as PaginatedBookmarks | undefined;
          if (!data?.pages || data.pages.length === 0) {
            return destinationData;
          }
          return produce(data, (draft) => {
            if (draft.pages[0]) {
              const existingIds = new Set(draft.pages[0].map((bookmark) => bookmark.id));
              const newBookmarks = variables.data.filter(
                (bookmark) => !existingIds.has(bookmark.id),
              );
              draft.pages[0].unshift(...newBookmarks);
            }
          });
        },
      },
      // Search cache (SearchPage envelope) — only present when actively searching
      {
        getQueryKey: () => searchQueryKey,
        updater: (searchData, variables) => {
          const data = searchData as PaginatedSearch | undefined;
          if (!data?.pages || data.pages.length === 0) {
            return searchData;
          }
          const idsToRemove = new Set(variables.data.map((bookmark) => bookmark.id));
          return produce(data, (draft) => {
            for (const page of draft.pages) {
              page.items = page.items.filter((bookmark) => !idsToRemove.has(bookmark.id));
            }
          });
        },
      },
    ],
    mutationFn: moveBookmarkToTrash,
    onSettled: (_data, error, variables) => {
      if (error) {
        return;
      }
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });
      if (variables.isTrash) {
        void queryClient.invalidateQueries({
          queryKey: [BOOKMARKS_KEY, session?.user?.id, TRASH_URL],
        });
      }
    },
    queryKey,
    showSuccessToast: false,
    updater: (currentData, variables) => {
      if (!currentData?.pages) {
        return currentData!;
      }
      const bookmarkIdsToRemove = new Set(variables.data.map((bookmark) => bookmark.id));
      return produce(currentData, (draft) => {
        for (let i = 0; i < draft.pages.length; i += 1) {
          if (!draft.pages[i]) {
            continue;
          }
          draft.pages[i] = draft.pages[i].filter(
            (bookmark) => !bookmarkIdsToRemove.has(bookmark.id),
          );
        }
      });
    },
  });

  return { moveBookmarkToTrashOptimisticMutation };
};
```

The two key changes from the current file:

1. `secondaryQueryKey: searchQueryKey` removed.
2. New `additionalOptimisticUpdates` entry mutates `pages[].items` for the search cache.

- [ ] **Step 10.2: Lint + build** — `pnpm fix:ultracite src/async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation.ts && pnpm build`
- [ ] **Step 10.3: Commit** — `git add src/async/mutationHooks/bookmarks/use-move-bookmark-to-trash-optimistic-mutation.ts && git commit -m "refactor(mutations): use additionalOptimisticUpdates for search cache in trash mutation"`

---

## Task 11: Migrate toggle-discoverable mutation to envelope-aware updater

**Files:** Replace `src/async/mutationHooks/bookmarks/use-toggle-discoverable-optimistic-mutation.ts`

This hook's `invalidates` is `[BOOKMARKS_KEY, DISCOVER_URL]` — it does NOT prefix-match the search query key, so dropping `secondaryQueryKey` would lose invalidation. Add the search key to `invalidates` explicitly.

- [ ] **Step 11.1: Replace file**

```ts
import { produce } from "immer";

import type {
  ToggleBookmarkDiscoverablePayload,
  ToggleBookmarkDiscoverableResponse,
} from "@/app/api/bookmark/toggle-discoverable-on-bookmark/schema";
import type { PaginatedBookmarks, PaginatedSearch } from "@/types/apiTypes";

import { useBookmarkMutationContext } from "@/hooks/use-bookmark-mutation-context";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import {
  BOOKMARKS_KEY,
  DISCOVER_URL,
  NEXT_API_URL,
  TOGGLE_BOOKMARK_DISCOVERABLE_API,
} from "@/utils/constants";
import { updateBookmarkInPaginatedData } from "@/utils/query-cache-helpers";

export function useToggleDiscoverableOptimisticMutation() {
  const { queryKey, searchQueryKey } = useBookmarkMutationContext();

  const toggleDiscoverableOptimisticMutation = useReactQueryOptimisticMutation<
    ToggleBookmarkDiscoverableResponse,
    Error,
    ToggleBookmarkDiscoverablePayload,
    typeof queryKey,
    PaginatedBookmarks
  >({
    additionalOptimisticUpdates: [
      {
        getQueryKey: () => searchQueryKey,
        updater: (searchData, variables) => {
          const data = searchData as PaginatedSearch | undefined;
          if (!data?.pages || data.pages.length === 0) {
            return searchData;
          }
          return produce(data, (draft) => {
            for (const page of draft.pages) {
              for (const bookmark of page.items) {
                if (bookmark.id === variables.bookmark_id) {
                  bookmark.make_discoverable = variables.make_discoverable ? "pending" : null;
                }
              }
            }
          });
        },
      },
    ],
    invalidates: [[BOOKMARKS_KEY, DISCOVER_URL], ...(searchQueryKey ? [searchQueryKey] : [])],
    mutationFn: (variables) =>
      postApi<ToggleBookmarkDiscoverableResponse>(
        `${NEXT_API_URL}${TOGGLE_BOOKMARK_DISCOVERABLE_API}`,
        variables,
      ),
    queryKey,
    updater: (currentData, variables) =>
      updateBookmarkInPaginatedData(currentData, variables.bookmark_id, (bookmark) => {
        bookmark.make_discoverable = variables.make_discoverable ? "pending" : null;
      })!,
  });

  return { toggleDiscoverableOptimisticMutation };
}
```

- [ ] **Step 11.2: Lint + build** — `pnpm fix:ultracite src/async/mutationHooks/bookmarks/use-toggle-discoverable-optimistic-mutation.ts && pnpm build`
- [ ] **Step 11.3: Commit** — `git add src/async/mutationHooks/bookmarks/use-toggle-discoverable-optimistic-mutation.ts && git commit -m "refactor(mutations): use additionalOptimisticUpdates for search cache in discoverable toggle"`

---

## Task 12: Final verification

- [ ] **Step 12.1: Sweep for `color:` parsing** — Grep `color:\\(\\\\S` and `parseSearchColor` across `src`. Expected: `parseSearchColor` only in `src/utils/colorUtils.ts` (definition) and `src/utils/search-tokens.ts` (consumer). No `color:(\S+)` regex anywhere. CSS `color: var(--...)` matches are unrelated.
- [ ] **Step 12.2: Sweep for stale `pages.flat()`** — Grep `pages\\?\\.flat\\(\\)` in `src`. Inspect each match: any read against the search query key `[BOOKMARKS_KEY, userId, segment, searchText]` must use `flatMap(p => p.items)`. Update inline if missed.
- [ ] **Step 12.3: Full pipeline** — `pnpm fix && pnpm lint && pnpm build`. Watch for: `pnpm lint:knip` flagging `extractTagNamesFromSearch` in `src/utils/helpers.ts` as unused (its only consumers were the deleted v1 route + the old v2 route's inline copy) — remove the export if knip flags it.
- [ ] **Step 12.4: Manual smoke in dev** — open dashboard, ensure dev DB has at least one tag named "blue" plus a few bookmarks with blue images and a few with red+blue. Verify in browser:
  - `#blue` → tag results page first, then color matches when scrolling
  - `#typescript` → tag results only
  - `#ff0000` → color matches
  - `#red #blue` → bookmarks with BOTH colors
  - `react #blue` → text "react" intersected with each phase
  - Move a bookmark to trash from search results: optimistic removal works, doesn't reappear after refetch
- [ ] **Step 12.5: Optional cleanup commit** — if `pnpm fix` made unrelated auto-fixes, `git status` and selectively stage only relevant ones.

---

## Acceptance Criteria

- [ ] `color:` parsing removed from `src/`
- [ ] `#blue` returns tag-named "blue" results first, then blue-color results, deduplicated
- [ ] `#ff0000` returns red color matches
- [ ] `#red #blue` returns bookmarks containing BOTH colors (AND)
- [ ] `#typescript` returns only tag-named results (no color RPC observable in DB logs)
- [ ] Pagination is seamless across the tag → color phase transition (no short pages)
- [ ] Mutations update the search cache optimistically without crashing on the new envelope shape
- [ ] `pnpm fix && pnpm lint && pnpm build` is green
- [ ] Scalar UI at `/api-docs` shows the new `cursor` parameter and the wrapped response
- [ ] Orphaned v1 Pages Router search route file is gone

## Self-Review Notes

1. **Tag phase always runs** — even when `tagTokens.length === 0` (e.g. plain text `react`), the tag RPC executes with `tag_scope = undefined`. It serves the plain text + URL/category scope path.
2. **Color phase only runs with color tokens.** Stale `phase: "color"` cursor with no color tokens resets to tag phase (graceful recovery, not 400).
3. **`tagTokens` is lowercased on extraction.** `classifySearchTokens` lowercases display strings; the SQL `LOWER(...) = ANY(...)` filter and the dedupe count comparison both use `LOWER`, so case round-trips correctly.
4. **Hex tokens hit the tag RPC.** `parseSearchColor("ff0000")` succeeds, so `#ff0000` is in both arrays. Tag phase looks for the literal "ff0000" tag (typically empty) before falling through.
5. **Mutation updaters never touch `next_cursor`.** They mutate `page.items` only.
6. **`PaginatedBookmarks` is unchanged.** Only the search cache uses `PaginatedSearch`.
7. **Discover page uses the same cursor protocol.** `isDiscoverPage` only switches auth + the `make_discoverable IS NOT NULL` filter (applied at route level via `.not(...)`, not in either RPC).

## References

- Brainstorm: `docs/brainstorms/2026-04-07-hash-color-search-syntax-brainstorm.md`
- Latest RPC migration: `supabase/migrations/20260406111130_flatten_colors_to_sorted_array.sql`
- v2 route: `src/app/api/v2/bookmark/search-bookmarks/route.ts`
- v2 schemas: `src/app/api/v2/bookmark/search-bookmarks/schema.ts`
- OpenAPI supplement: `src/lib/openapi/endpoints/bookmarks/v2-search-bookmarks.ts`
- Frontend hook: `src/async/queryHooks/bookmarks/use-search-bookmarks.ts`
- Cache reader: `src/pageComponents/dashboard/cardSection/index.tsx:113-121`
- Conventions: `.claude/rules/api-v2.md`, `.claude/rules/openapi.md`, `.claude/rules/supabase-functions.md`, `.claude/rules/supabase-cli.md`, `.claude/rules/gotchas.md`
