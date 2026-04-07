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
        -- (would have appeared via search_bookmarks_url_tag_scope with
        -- tag_scope = exclude_tag_scope)
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
