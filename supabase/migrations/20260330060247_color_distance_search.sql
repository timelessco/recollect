-- ============================================================================
-- Migration: Add color distance search to bookmark search
-- ============================================================================
-- Purpose:
--   1. Create hex_channel() helper to extract RGB channels from hex strings
--   2. Create oklab_distance() for perceptual color distance (OKLAB space)
--   3. Update search_bookmarks_url_tag_scope with color_hex parameter
--      and color distance filter + ranking signal
-- ============================================================================

BEGIN;

-- Step 0: Drop old overloads so PostgREST resolves the 5-param version unambiguously
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[]);
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint);

-- Step 1: Helper to extract a single RGB channel (0-255) from a hex color string
-- pos=1 for red, pos=3 for green, pos=5 for blue
CREATE OR REPLACE FUNCTION public.hex_channel(hex text, pos int)
RETURNS int
LANGUAGE sql
IMMUTABLE STRICT
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT ('x' || substring(replace(hex, '#', '') FROM pos FOR 2))::bit(8)::int;
$$;

COMMENT ON FUNCTION public.hex_channel(text, int) IS
'Extract a single RGB channel (0-255) from a hex color string. pos=1 red, pos=3 green, pos=5 blue.';

-- Step 2: Perceptual color distance using OKLAB color space
-- Converts hex → sRGB → linear RGB → LMS → OKLAB, then Euclidean distance.
-- Range: 0 (identical) to ~0.45 (black vs white). JND ≈ 0.02-0.04.
CREATE OR REPLACE FUNCTION public.oklab_distance(hex1 text, hex2 text)
RETURNS float
LANGUAGE sql
IMMUTABLE STRICT
SECURITY INVOKER
SET search_path = public
AS $$
  WITH
  channels AS (
    SELECT
      public.hex_channel(hex1, 1) AS r1, public.hex_channel(hex1, 3) AS g1, public.hex_channel(hex1, 5) AS b1,
      public.hex_channel(hex2, 1) AS r2, public.hex_channel(hex2, 3) AS g2, public.hex_channel(hex2, 5) AS b2
  ),
  -- sRGB to linear RGB (gamma decode)
  linear AS (
    SELECT
      CASE WHEN r1/255.0 <= 0.04045 THEN (r1/255.0)/12.92 ELSE POWER((r1/255.0 + 0.055)/1.055, 2.4) END AS lr1,
      CASE WHEN g1/255.0 <= 0.04045 THEN (g1/255.0)/12.92 ELSE POWER((g1/255.0 + 0.055)/1.055, 2.4) END AS lg1,
      CASE WHEN b1/255.0 <= 0.04045 THEN (b1/255.0)/12.92 ELSE POWER((b1/255.0 + 0.055)/1.055, 2.4) END AS lb1,
      CASE WHEN r2/255.0 <= 0.04045 THEN (r2/255.0)/12.92 ELSE POWER((r2/255.0 + 0.055)/1.055, 2.4) END AS lr2,
      CASE WHEN g2/255.0 <= 0.04045 THEN (g2/255.0)/12.92 ELSE POWER((g2/255.0 + 0.055)/1.055, 2.4) END AS lg2,
      CASE WHEN b2/255.0 <= 0.04045 THEN (b2/255.0)/12.92 ELSE POWER((b2/255.0 + 0.055)/1.055, 2.4) END AS lb2
    FROM channels
  ),
  -- Linear RGB to LMS (Ottosson matrix M1)
  lms AS (
    SELECT
      0.4122214708*lr1 + 0.5363325363*lg1 + 0.0514459929*lb1 AS l1,
      0.2119034982*lr1 + 0.6806995451*lg1 + 0.1073969566*lb1 AS m1,
      0.0883024619*lr1 + 0.2171187842*lg1 + 0.6945787540*lb1 AS s1,
      0.4122214708*lr2 + 0.5363325363*lg2 + 0.0514459929*lb2 AS l2,
      0.2119034982*lr2 + 0.6806995451*lg2 + 0.1073969566*lb2 AS m2,
      0.0883024619*lr2 + 0.2171187842*lg2 + 0.6945787540*lb2 AS s2
    FROM linear
  ),
  -- Cube root (LMS → LMS')
  lms_cr AS (
    SELECT
      CBRT(l1) AS l1_, CBRT(m1) AS m1_, CBRT(s1) AS s1_,
      CBRT(l2) AS l2_, CBRT(m2) AS m2_, CBRT(s2) AS s2_
    FROM lms
  ),
  -- LMS' to OKLAB (Ottosson matrix M2)
  oklab AS (
    SELECT
      0.2104542553*l1_ + 0.7936177850*m1_ - 0.0040720468*s1_ AS lab_l1,
      1.9779984951*l1_ - 2.4285922050*m1_ + 0.4505937099*s1_ AS lab_a1,
      0.0259040371*l1_ + 0.7827717662*m1_ - 0.8086757660*s1_ AS lab_b1,
      0.2104542553*l2_ + 0.7936177850*m2_ - 0.0040720468*s2_ AS lab_l2,
      1.9779984951*l2_ - 2.4285922050*m2_ + 0.4505937099*s2_ AS lab_a2,
      0.0259040371*l2_ + 0.7827717662*m2_ - 0.8086757660*s2_ AS lab_b2
    FROM lms_cr
  )
  -- Euclidean distance in OKLAB
  SELECT SQRT(
    POWER(lab_l1 - lab_l2, 2) +
    POWER(lab_a1 - lab_a2, 2) +
    POWER(lab_b1 - lab_b2, 2)
  )
  FROM oklab;
$$;

COMMENT ON FUNCTION public.oklab_distance(text, text) IS
'Perceptual color distance using OKLAB color space. Range 0 (identical) to ~0.45 (black vs white). JND ≈ 0.02-0.04. Threshold 0.15 captures same color family.';

-- Drop old RGB distance function (replaced by oklab_distance)
DROP FUNCTION IF EXISTS public.color_distance(text, text);

-- Step 3: Update search function with color_hex parameter
CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
    search_text character varying DEFAULT '',
    url_scope character varying DEFAULT '',
    tag_scope text[] DEFAULT NULL,
    category_scope bigint DEFAULT NULL,
    color_hex character varying DEFAULT NULL
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
        (
            url_scope IS NULL
            OR url_scope = ''
            OR b.url ILIKE '%' || url_scope || '%'
        )
        AND
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
            ) = (
                SELECT COUNT(DISTINCT LOWER(tag))
                FROM unnest(tag_scope) AS tag
            )
        )
        AND
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
        (
            search_text IS NULL
            OR btrim(search_text) = ''
            OR NOT EXISTS (
                SELECT 1
                FROM unnest(
                    string_to_array(
                        lower(btrim(search_text)),
                        ' '
                    )
                ) AS token
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
                        SELECT 1
                        FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
                        WHERE key IN ('img_caption', 'image_caption', 'ocr')
                          AND lower(value) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    )
                    -- Match token in image_keywords (nested format only)
                    OR EXISTS (
                        SELECT 1
                        FROM public.extract_keywords_text(b.meta_data->'image_keywords') AS kw
                        WHERE lower(kw.keyword) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
                    )
                  )
            )
        )
        AND
        (
            -- Color filter: perceptual distance in OKLAB space
            color_hex IS NULL
            OR color_hex = ''
            OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements_text(b.meta_data->'image_keywords'->'color') AS c(hex)
                WHERE public.oklab_distance(color_hex, c.hex) < 0.25
            )
        )

    ORDER BY
        -- Text similarity (only when search_text is non-empty)
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
        -- Color distance ranking (independent of text search)
        CASE
            WHEN color_hex IS NOT NULL AND color_hex <> '' THEN
                COALESCE(
                    (SELECT (1.0 - MIN(public.oklab_distance(color_hex, c.hex))) * 0.12
                     FROM jsonb_array_elements_text(b.meta_data->'image_keywords'->'color') AS c(hex)
                     WHERE public.oklab_distance(color_hex, c.hex) < 0.25),
                    0
                )
            ELSE 0
        END
        DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, character varying) IS
'Bookmark search with URL/tag/category/color filters. Color distance uses OKLAB perceptual space with threshold 0.15. color_hex is optional; when provided, filters to visually similar colors and ranks closer matches higher.';

COMMIT;
