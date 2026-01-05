-- ============================================================================
-- MIGRATION: Add discoverability feature for bookmarks
-- Created: 2026-01-05
-- Purpose: Enable bookmarks to be publicly discoverable via make_discoverable column
-- ============================================================================
--
-- This migration:
--   1. Adds make_discoverable column to everything table
--   2. Updates search_bookmarks_url_tag_scope RPC to return new column
--   3. Creates RLS policies for anonymous and authenticated discover access
--
-- NOTE: Indexes are intentionally not created here to avoid table locks.
-- Add indexes later if performance monitoring shows need.
--
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: Add make_discoverable column
-- ============================================================================

-- 1. Add make_discoverable column to everything table
-- NULL means not discoverable, timestamp means when it was made discoverable
-- Users can explicitly set this to a timestamp for bookmarks they want to make public
ALTER TABLE "public"."everything"
ADD COLUMN IF NOT EXISTS "make_discoverable" timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN "public"."everything"."make_discoverable" IS
'Controls whether this bookmark is publicly discoverable. When NOT NULL and trash is false, the bookmark is visible to anonymous/public users via the public_discover_access RLS policy. The timestamp indicates when the bookmark was made discoverable.';

-- ============================================================================
-- PART 2: Update search function
-- ============================================================================

-- 1. Update search_bookmarks_url_tag_scope function to include make_discoverable in RETURNS TABLE
-- Need to DROP first because PostgreSQL doesn't allow changing return type with CREATE OR REPLACE
SET check_function_bodies = off;

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint);

-- 2. Create updated function with make_discoverable column
-- NOTE: Uses `extensions` in search_path instead of `pg_temp` because
-- the function returns `extensions.citext` type which requires access to that schema
CREATE FUNCTION public.search_bookmarks_url_tag_scope(
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
    trash boolean,
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

RESET check_function_bodies;

-- 3. Set permissions (maintain existing access pattern)
REVOKE EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) TO anon;

-- 4. Add function documentation
COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) IS
'Bookmark search with URL/tag/category filters. Returns make_discoverable timestamp for discoverability feature. Uses CTEs to avoid N+1 queries when aggregating tags and categories.';

-- ============================================================================
-- PART 3: Create RLS policies
-- ============================================================================

-- 1. Drop existing policies if they exist
DROP POLICY IF EXISTS "anon_discover_access" ON "public"."everything";
DROP POLICY IF EXISTS "authenticated_discover_access" ON "public"."everything";

-- 2. Policy for anonymous (unauthenticated) users
CREATE POLICY "anon_discover_access"
ON "public"."everything"
AS permissive
FOR SELECT
TO anon
USING (
    make_discoverable IS NOT NULL
    AND trash = false
);

COMMENT ON POLICY "anon_discover_access" ON public.everything IS
'Allows anonymous (unauthenticated) users to read bookmarks marked as discoverable and not in trash.';

-- 3. Policy for authenticated users
CREATE POLICY "authenticated_discover_access"
ON "public"."everything"
AS permissive
FOR SELECT
TO authenticated
USING (
    make_discoverable IS NOT NULL
    AND trash = false
);

COMMENT ON POLICY "authenticated_discover_access" ON public.everything IS
'Allows authenticated users to read bookmarks marked as discoverable and not in trash.';

-- ============================================================================
-- PART 4: Post-migration verification
-- ============================================================================

DO $$
BEGIN
    -- Verify column was added
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'everything'
          AND column_name = 'make_discoverable'
    ) THEN
        RAISE EXCEPTION 'Migration failed: make_discoverable column not created';
    END IF;

    -- Verify policies were created
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'everything'
          AND policyname = 'anon_discover_access'
    ) THEN
        RAISE EXCEPTION 'Migration failed: anon_discover_access policy not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'everything'
          AND policyname = 'authenticated_discover_access'
    ) THEN
        RAISE EXCEPTION 'Migration failed: authenticated_discover_access policy not created';
    END IF;

    RAISE NOTICE 'Migration verified: make_discoverable column and RLS policies created successfully';
END $$;

COMMIT;
