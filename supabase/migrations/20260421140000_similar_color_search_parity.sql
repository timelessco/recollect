-- ============================================================================
-- Migration: Align match_similar_bookmarks color predicate with color search
-- ============================================================================
-- Purpose:
--   The similarity RPC previously gated candidate colors with a raw
--   `lch_color_score >= 0.75` threshold. The color-search function, refined
--   over several migrations (20260415120000, 20260416120000, 20260416160000),
--   applies positional decay on candidate position plus a quality floor —
--   `lch_color_score × exp(-0.4 × (pos − 1)) >= 0.50` — so that only dominant
--   and near-dominant stored colors can contribute. Adopt the same predicate
--   here so similarity ranks colors with the same priority model as search:
--   the first color is the most important, and secondary colors must score
--   very highly to count.
--
--   Everything else (scoring weights, min-score threshold, ordering) is
--   unchanged from 20260421130000.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.match_similar_bookmarks(
  p_bookmark_id bigint,
  p_min_score int DEFAULT 4
)
RETURNS TABLE (
  id bigint,
  score int
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  WITH source AS (
    SELECT
      e.id,
      e.user_id,
      e.meta_data -> 'image_keywords' -> 'colors' AS src_colors,
      e.meta_data -> 'image_keywords' -> 'object' AS src_objects,
      e.meta_data -> 'image_keywords' -> 'type'   AS src_ai_types,
      lower(substring(e.url FROM '(?:https?://)?(?:www\.)?([^/?#]+)')) AS src_domain
    FROM public.everything e
    WHERE e.id = p_bookmark_id
      AND e.user_id = (SELECT auth.uid())
  ),
  source_tag_ids AS (
    SELECT bt.tag_id
    FROM public.bookmark_tags bt, source s
    WHERE bt.bookmark_id = p_bookmark_id
      AND bt.user_id = s.user_id
  ),
  source_category_ids AS (
    SELECT bc.category_id
    FROM public.bookmark_categories bc, source s
    WHERE bc.bookmark_id = p_bookmark_id
      AND bc.user_id = s.user_id
  ),
  candidates AS (
    SELECT
      e.id,
      e.inserted_at,
      e.meta_data -> 'image_keywords' AS kw,
      lower(substring(e.url FROM '(?:https?://)?(?:www\.)?([^/?#]+)')) AS domain
    FROM public.everything e, source s
    WHERE e.user_id = s.user_id
      AND e.trash IS NULL
      AND e.id <> s.id
  ),
  -- For each of the source's top-3 dominant colors, count it as a match if
  -- ANY candidate color clears the decayed quality floor:
  --     lch_color_score × exp(-0.4 × (candidate_pos − 1)) >= 0.50
  -- Same predicate used by public.search_bookmarks_url_tag_scope, so color
  -- similarity here follows the same priority model as color search:
  -- position 1 (most dominant) is the strictest signal, each deeper color
  -- has to score exponentially higher to still qualify.
  color_scored AS (
    SELECT
      c.id,
      coalesce((
        SELECT count(*)
        FROM jsonb_array_elements(s.src_colors) WITH ORDINALITY AS sc(color, ord)
        WHERE sc.ord <= 3
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(c.kw -> 'colors') WITH ORDINALITY AS cc(color, pos)
            WHERE public.lch_color_score(
              (sc.color ->> 'l')::double precision,
              (sc.color ->> 'a')::double precision,
              (sc.color ->> 'b')::double precision,
              (cc.color ->> 'l')::double precision,
              (cc.color ->> 'a')::double precision,
              (cc.color ->> 'b')::double precision
            ) * exp(-0.4 * (cc.pos - 1)) >= 0.50
          )
      ), 0) AS color_matches
    FROM candidates c, source s
  ),
  object_scored AS (
    SELECT
      c.id,
      coalesce((
        SELECT count(*)
        FROM jsonb_array_elements_text(s.src_objects) AS src_obj
        WHERE src_obj IN (
          SELECT jsonb_array_elements_text(c.kw -> 'object')
        )
      ), 0) AS object_matches
    FROM candidates c, source s
  ),
  ai_type_scored AS (
    SELECT
      c.id,
      coalesce((
        SELECT count(*)
        FROM jsonb_array_elements_text(s.src_ai_types) AS src_type
        WHERE src_type IN (
          SELECT jsonb_array_elements_text(c.kw -> 'type')
        )
      ), 0) AS ai_type_matches
    FROM candidates c, source s
  ),
  tag_scored AS (
    SELECT bt.bookmark_id AS id, count(*) AS tag_matches
    FROM public.bookmark_tags bt
    WHERE bt.tag_id IN (SELECT tag_id FROM source_tag_ids)
      AND bt.bookmark_id <> p_bookmark_id
    GROUP BY bt.bookmark_id
  ),
  category_scored AS (
    SELECT bc.bookmark_id AS id, count(*) AS category_matches
    FROM public.bookmark_categories bc
    WHERE bc.category_id IN (SELECT category_id FROM source_category_ids)
      AND bc.bookmark_id <> p_bookmark_id
    GROUP BY bc.bookmark_id
  ),
  domain_scored AS (
    SELECT
      c.id,
      CASE
        WHEN s.src_domain IS NOT NULL AND c.domain = s.src_domain THEN 1
        ELSE 0
      END AS domain_match
    FROM candidates c, source s
  ),
  totals AS (
    SELECT
      c.id,
      c.inserted_at,
      (
        2 * coalesce(cs.color_matches,     0)
      + 3 * coalesce(os.object_matches,    0)
      + 3 * coalesce(ats.ai_type_matches,  0)
      + 2 * coalesce(ts.tag_matches,       0)
      + 1 * coalesce(cts.category_matches, 0)
      + 1 * coalesce(ds.domain_match,      0)
      )::int AS score
    FROM candidates c
    LEFT JOIN color_scored    cs  ON cs.id  = c.id
    LEFT JOIN object_scored   os  ON os.id  = c.id
    LEFT JOIN ai_type_scored  ats ON ats.id = c.id
    LEFT JOIN tag_scored      ts  ON ts.id  = c.id
    LEFT JOIN category_scored cts ON cts.id = c.id
    LEFT JOIN domain_scored   ds  ON ds.id  = c.id
  )
  SELECT t.id, t.score
  FROM totals t
  WHERE t.score >= p_min_score
  ORDER BY t.score DESC, t.inserted_at DESC;
$$;

COMMIT;
