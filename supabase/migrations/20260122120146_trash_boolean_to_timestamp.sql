-- ============================================================================
-- Migration: Convert trash column from boolean to timestamp with time zone
-- ============================================================================
-- Purpose: Enable sorting of trashed items by recency
-- Changes:
--   - trash column: boolean -> timestamp with time zone
--   - NULL = not in trash
--   - timestamp = when item was moved to trash
-- Affected: everything table, search_bookmarks_url_tag_scope function, RLS policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Drop RLS policies that depend on trash column FIRST
-- ============================================================================
-- Must drop policies BEFORE altering column type

DROP POLICY IF EXISTS "anon_discover_access" ON public.everything;
DROP POLICY IF EXISTS "authenticated_discover_access" ON public.everything;

-- ============================================================================
-- PART 2: Alter the trash column type
-- ============================================================================

-- Convert boolean to timestamp:
--   - false -> NULL (not trashed)
--   - true -> NOW() (fallback timestamp for existing trashed items)
ALTER TABLE public.everything
ALTER COLUMN trash DROP DEFAULT;

ALTER TABLE public.everything
ALTER COLUMN trash TYPE timestamp with time zone
USING CASE WHEN trash = true THEN NOW() ELSE NULL END;

-- Drop the NOT NULL constraint (column should be nullable)
ALTER TABLE public.everything
ALTER COLUMN trash DROP NOT NULL;

-- Set new default to NULL (not trashed)
ALTER TABLE public.everything
ALTER COLUMN trash SET DEFAULT NULL;

COMMENT ON COLUMN public.everything.trash IS
'Soft delete timestamp. NULL means not trashed. When set, indicates when the bookmark was moved to trash.';

-- ============================================================================
-- PART 3: Create partial indexes for query optimization
-- ============================================================================

-- Index for active (non-trash) bookmarks
-- Optimizes queries that filter by user_id and trash IS NULL, ordered by
-- inserted_at DESC (newest first). This is the default sort for the dashboard.
CREATE INDEX IF NOT EXISTS idx_everything_active
ON public.everything(user_id, inserted_at DESC)
WHERE trash IS NULL;

COMMENT ON INDEX idx_everything_active IS
'Partial index for active (non-trash) bookmarks. Optimizes queries filtering by user_id where trash IS NULL, ordered by inserted_at DESC.';

-- Index for trash bookmarks
-- Optimizes queries that filter by user_id and trash IS NOT NULL, ordered by
-- trash DESC (most recently trashed first). This is the sort used on the trash page.
CREATE INDEX IF NOT EXISTS idx_everything_trash
ON public.everything(user_id, trash DESC)
WHERE trash IS NOT NULL;

COMMENT ON INDEX idx_everything_trash IS
'Partial index for trashed bookmarks. Optimizes queries filtering by user_id where trash IS NOT NULL, ordered by trash DESC (most recently trashed first).';

-- Index for discoverable bookmarks (used by RLS policies)
CREATE INDEX IF NOT EXISTS idx_everything_make_discoverable
ON public.everything(make_discoverable)
WHERE make_discoverable IS NOT NULL;

-- ============================================================================
-- PART 4: Recreate RLS policies with updated trash condition
-- ============================================================================

CREATE POLICY "anon_discover_access"
ON public.everything
FOR SELECT
TO anon
USING (
    make_discoverable IS NOT NULL
    AND trash IS NULL
);

COMMENT ON POLICY "anon_discover_access" ON public.everything IS
'Allows anonymous (unauthenticated) users to read bookmarks marked as discoverable and not in trash.';

CREATE POLICY "authenticated_discover_access"
ON public.everything
FOR SELECT
TO authenticated
USING (
    make_discoverable IS NOT NULL
    AND trash IS NULL
);

COMMENT ON POLICY "authenticated_discover_access" ON public.everything IS
'Allows authenticated users to read bookmarks marked as discoverable and not in trash.';

-- ============================================================================
-- PART 5: Update search_bookmarks_url_tag_scope function
-- ============================================================================

-- Drop existing function to allow signature change
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint);

-- Recreate function with updated return type (trash as timestamp with time zone)
CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    tag_scope text[] DEFAULT NULL,
    category_scope bigint DEFAULT NULL
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
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $function$
BEGIN
    SET LOCAL pg_trgm.similarity_threshold = 0.6;

    RETURN QUERY
    WITH
    -- Pre-aggregate tags (single pass, avoids N+1)
    bookmark_tags_agg AS (
        SELECT
            bt.bookmark_id,
            bt.user_id,
            jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name)) AS tags_json
        FROM public.bookmark_tags bt
        JOIN public.tags t ON t.id = bt.tag_id
        GROUP BY bt.bookmark_id, bt.user_id
    ),
    -- Pre-aggregate categories (single pass, avoids N+1)
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
        b.id,
        b.user_id,
        b.inserted_at,
        b.title,
        b.url,
        b.description,
        b."ogImage",
        b.screenshot,
        b.trash,
        b.type,
        b.meta_data,
        b.sort_index,
        COALESCE(bta.tags_json, '[]'::jsonb) AS added_tags,
        COALESCE(bca.categories_json, '[]'::jsonb) AS added_categories,
        b.make_discoverable
    FROM public.everything b
    LEFT JOIN bookmark_tags_agg bta ON bta.bookmark_id = b.id AND bta.user_id = b.user_id
    LEFT JOIN bookmark_cats_agg bca ON bca.bookmark_id = b.id AND bca.user_id = b.user_id
    WHERE
        -- URL scope filter (optional)
        (
            url_scope IS NULL
            OR url_scope = ''
            OR b.url ILIKE '%' || url_scope || '%'
        )

        AND
        -- Tag scope filter (optional, supports multiple tags with AND logic)
        (
            tag_scope IS NULL
            OR array_length(tag_scope, 1) IS NULL
            OR (
                SELECT COUNT(DISTINCT LOWER(t.name))
                FROM public.bookmark_tags bt
                JOIN public.tags t ON t.id = bt.tag_id
                WHERE bt.bookmark_id = b.id
                  AND LOWER(t.name) = ANY(
                      SELECT LOWER(unnest(tag_scope))
                  )
            ) = array_length(tag_scope, 1)  -- Must match ALL searched tags (AND logic)
        )

        AND
        -- Category scope filter via junction table (optional)
        (
            category_scope IS NULL
            OR EXISTS (
                SELECT 1
                FROM public.bookmark_categories bc
                WHERE bc.bookmark_id = b.id
                  AND bc.category_id = category_scope
            )
        )

        AND
        -- Main search_text logic (optional)
        (
            search_text IS NULL
            OR search_text = ''
            OR (
                search_text % ANY(STRING_TO_ARRAY(COALESCE(b.title::text, '') || ' ' || COALESCE(b.description, ''), ' '))
                OR b.url ILIKE '%' || search_text || '%'
                OR EXISTS (
                    SELECT 1
                    FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
                    WHERE key IN ('img_caption', 'ocr')
                      AND value ILIKE '%' || search_text || '%'
                )
            )
        )

    ORDER BY
        CASE
            WHEN search_text IS NULL OR search_text = '' THEN 0
            ELSE (
                similarity(COALESCE(b.url, ''), search_text) * 0.6 +
                similarity(COALESCE(b.title::text, ''), search_text) * 0.5 +
                similarity(COALESCE(b.description, ''), search_text) * 0.3 +
                similarity(COALESCE(b.meta_data->>'ocr', ''), search_text) * 0.1 +
                similarity(COALESCE(b.meta_data->>'img_caption', ''), search_text) * 0.15
            )
        END DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) IS
'Bookmark search with URL/tag/category filters. Uses CTEs to avoid N+1 queries when aggregating tags and categories.';

-- ============================================================================
-- PART 6: Post-migration verification queries (for manual testing)
-- ============================================================================
-- Run these after migration to verify:
--
-- 1. Check column type changed:
--    SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'everything' AND column_name = 'trash';
--
-- 2. Verify trashed items have timestamps:
--    SELECT id, trash FROM public.everything WHERE trash IS NOT NULL LIMIT 5;
--
-- 3. Verify non-trashed items are NULL:
--    SELECT id, trash FROM public.everything WHERE trash IS NULL LIMIT 5;
-- ============================================================================

COMMIT;
