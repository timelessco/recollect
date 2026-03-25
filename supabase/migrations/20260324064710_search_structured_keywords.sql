-- ============================================================================
-- Migration: Nested structured keywords for bookmark search
-- ============================================================================
-- Purpose:
--   1. Migrate ALL existing image_keywords to the new nested format:
--      { "type": ["..."], "people": ["..."], "features": { "brand": "..." } }
--   2. Create extract_keywords_text() helper for search
--   3. Update search_bookmarks_url_tag_scope to use the helper
--
-- Data migrations:
--   - Legacy array ["a", "b"]  → { "features": { "0": "a", "1": "b" } }
--   - Legacy flat object { "type": "movie", "brand": "IMDb" }
--     → { "features": { "type": "movie", "brand": "IMDb" } }
--   - New nested format: left as-is
-- ============================================================================

BEGIN;

-- Step 1: Migrate legacy flat objects → wrap in features
-- { "type": "movie", "brand": "IMDb" } → { "features": { "type": "movie", "brand": "IMDb" } }
UPDATE public.everything
SET meta_data = jsonb_set(
    meta_data,
    '{image_keywords}',
    jsonb_build_object('features', meta_data->'image_keywords')
)
WHERE meta_data->'image_keywords' IS NOT NULL
  AND jsonb_typeof(meta_data->'image_keywords') = 'object'
  AND NOT (meta_data->'image_keywords' ? 'features');

-- Step 2: Migrate legacy arrays → wrap in features with indexed keys
-- ["red", "car"] → { "features": { "0": "red", "1": "car" } }
UPDATE public.everything
SET meta_data = jsonb_set(
    meta_data,
    '{image_keywords}',
    jsonb_build_object('features', (
        SELECT COALESCE(jsonb_object_agg(idx::text, val), '{}'::jsonb)
        FROM jsonb_array_elements_text(meta_data->'image_keywords') WITH ORDINALITY AS t(val, idx)
    ))
)
WHERE meta_data->'image_keywords' IS NOT NULL
  AND jsonb_typeof(meta_data->'image_keywords') = 'array';

-- Step 3: Helper to extract all searchable strings from nested keywords
-- Only handles the new format: { "type": [...], "people": [...], "features": { ... } }
CREATE OR REPLACE FUNCTION public.extract_keywords_text(keywords jsonb)
RETURNS TABLE(keyword text)
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
  -- Top-level arrays: { "type": ["movie", "streaming"], "people": ["Tom Hanks"] }
  SELECT jsonb_array_elements_text(val)
  FROM jsonb_each(keywords) AS x(key, val)
  WHERE jsonb_typeof(val) = 'array'

  UNION ALL

  -- Nested objects (features): string values { "features": { "brand": "IMDb" } }
  SELECT v
  FROM jsonb_each(keywords) AS x(key, val),
       LATERAL jsonb_each_text(val) AS y(k, v)
  WHERE jsonb_typeof(val) = 'object'
    AND jsonb_typeof(val->k) NOT IN ('array', 'object')

  UNION ALL

  -- Nested objects with array values (features.additional_keywords): { "features": { "additional_keywords": ["fintech", "crypto"] } }
  SELECT jsonb_array_elements_text(inner_val)
  FROM jsonb_each(keywords) AS x(key, val),
       LATERAL jsonb_each(val) AS y(k, inner_val)
  WHERE jsonb_typeof(val) = 'object'
    AND jsonb_typeof(inner_val) = 'array';
$$;

COMMENT ON FUNCTION public.extract_keywords_text(jsonb) IS
'Extracts all searchable text from nested image_keywords: top-level arrays are unnested, feature string values are flattened, feature array values (additional_keywords) are unnested.';

-- Step 4: Update search function to use the helper
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

    ORDER BY
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
        END DESC,
        b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint) IS
'Bookmark search with URL/tag/category filters. Multi-word AND semantics: each token must match in title/description, url, or meta (img_caption, image_caption, ocr, image_keywords). Uses extract_keywords_text() for nested keyword format. VOLATILE so pg_trgm.similarity_threshold applies correctly.';

COMMIT;
