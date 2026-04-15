-- ============================================================================
-- Migration: OKLCh two-stage color search ranking
-- ============================================================================
-- Purpose:
--   Replace the OKLAB-Euclidean color ranking in `search_bookmarks_url_tag_scope`
--   with an OKLCh two-stage ranker (hard chroma/hue gates + Gaussian-weighted
--   quadratic distance + positional decay + quality floor).
--
--   The previous implementation let near-achromatic palettes (white/gray UIs)
--   surface above visually saturated matches for color queries like #red,
--   because OKLAB-Euclidean understates hue errors and overweights lightness
--   near achromatic colors.
--
-- Changes:
--   1. Create helper `lch_color_score(hint_l,a,b, stored_l,a,b) -> float` that
--      returns a similarity score in [0, 1], or 0 when chroma/hue gates reject
--      the stored color. Drops the old `color_matches_oklab` predicate.
--   2. Rewrite the 6-parameter `search_bookmarks_url_tag_scope` (the overload
--      with `type_hints text[]` added in 20260413050000_type_hints_search.sql)
--      to use the new color predicate and score expression. Signature, tag
--      precedence, type_hints tier, text similarity, and recency tiebreaker
--      stay unchanged.
--
-- Constants are tuned against a 1000-palette synthetic dataset to maximize
-- top-K visual agreement across representative queries (CSS names #red/#blue/
-- #green/#yellow/#purple/#orange/#brown/#pink/#teal, hex #FF0000/#8B4513/
-- #00FFAA, and achromatic #FFFFFF/#000000/#808080).
-- ============================================================================

BEGIN;

-- PART 1: Create `lch_color_score` helper.
--
-- Returns the perceptual similarity between a query (hint) OKLab color and a
-- stored palette OKLab color on a [0, 1] scale. Returns exactly 0 when a
-- hard gate rejects the pair, otherwise `exp(-d² / sigma²)` where d² is a
-- weighted quadratic distance in OKLCh space.

CREATE OR REPLACE FUNCTION public.lch_color_score(
  hint_l double precision,
  hint_a double precision,
  hint_b double precision,
  stored_l double precision,
  stored_a double precision,
  stored_b double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  -- Tuned constants (mirror src/utils/colorLab/rankByColor.ts DEFAULT_CONFIG
  -- used to iterate on the ranker against a 1000-palette synthetic dataset).
  c_chroma_floors CONSTANT double precision[] := ARRAY[
    0.035, 0.050, 0.080, 0.090, 0.060, 0.050, 0.060, 0.080, 0.090, 0.075, 0.050, 0.040
  ];
  c_window_multiplier CONSTANT double precision[] := ARRAY[
    1.00, 1.00, 0.70, 0.55, 0.70, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00, 1.00
  ];
  c_hue_hi_chroma CONSTANT double precision := 30.0;
  c_hue_lo_chroma CONSTANT double precision := 50.0;
  c_hi_threshold  CONSTANT double precision := 0.10;
  c_w_l           CONSTANT double precision := 1.3;
  c_w_c           CONSTANT double precision := 0.9;
  c_w_h           CONSTANT double precision := 1.6;
  c_sigma_sq      CONSTANT double precision := 0.16;  -- sigma = 0.4
  c_achromatic_cap     CONSTANT double precision := 0.04;
  c_achromatic_query   CONSTANT double precision := 0.04;
  c_bucket_sz     CONSTANT double precision := 30.0;  -- 360 / 12 buckets

  q_c double precision;
  s_c double precision;
  q_h double precision;
  q_eff_h double precision;
  s_h double precision;
  idx integer;
  nxt integer;
  t double precision;
  floor_val double precision;
  multiplier_val double precision;
  base_window double precision;
  window_deg double precision;
  dh_deg double precision;
  dh_rad double precision;
  d_l double precision;
  d_c double precision;
  hue_term double precision;
  d_sq double precision;
BEGIN
  q_c := sqrt(hint_a * hint_a + hint_b * hint_b);
  s_c := sqrt(stored_a * stored_a + stored_b * stored_b);

  -- Achromatic branch: query is grey/white/black. Reject saturated stored colors,
  -- score survivors on lightness delta only.
  IF q_c < c_achromatic_query THEN
    IF s_c > c_achromatic_cap THEN
      RETURN 0;
    END IF;
    d_l := hint_l - stored_l;
    RETURN exp(-(d_l * d_l) / c_sigma_sq);
  END IF;

  -- Chromatic branch: hues in [0, 360).
  q_h := degrees(atan2(hint_b, hint_a));
  IF q_h < 0 THEN
    q_h := q_h + 360.0;
  END IF;
  s_h := degrees(atan2(stored_b, stored_a));
  IF s_h < 0 THEN
    s_h := s_h + 360.0;
  END IF;

  -- Perceptual remap for pure CSS yellow: OKLCh places #ffff00 at h=110°,
  -- but humans center "yellow" at gold (~95°). Pull the effective query hue
  -- toward 95° so "yellow" search surfaces golds, not limes.
  q_eff_h := q_h;
  IF hint_l > 0.93 AND q_c > 0.17 AND q_h >= 105.0 AND q_h <= 118.0 THEN
    q_eff_h := 95.0;
  END IF;

  -- 12-bucket lookup with linear interpolation between adjacent buckets.
  idx := floor(q_eff_h / c_bucket_sz)::int;
  nxt := (idx + 1) % 12;
  t := (q_eff_h - idx * c_bucket_sz) / c_bucket_sz;

  -- Hard chroma gate keyed to query hue. Rejects near-achromatic palettes
  -- like white dashboards and grey UIs for saturated queries. The hue-bucket
  -- floor is capped at the query's own chroma so an exact or near-exact
  -- colour match is never gated out (the floor's purpose is "stored must
  -- plausibly be this hue", which is trivially true when stored ≈ query).
  floor_val := LEAST(
    c_chroma_floors[idx + 1] * (1.0 - t) + c_chroma_floors[nxt + 1] * t,
    q_c * 0.9
  );
  IF s_c < floor_val THEN
    RETURN 0;
  END IF;

  -- Hard hue gate. Base window tightens as query chroma rises, then a
  -- per-hue multiplier narrows it further at the yellow boundary.
  IF q_c >= c_hi_threshold THEN
    base_window := c_hue_hi_chroma;
  ELSE
    base_window := c_hue_lo_chroma
      + (q_c / c_hi_threshold) * (c_hue_hi_chroma - c_hue_lo_chroma);
  END IF;
  multiplier_val := c_window_multiplier[idx + 1] * (1.0 - t) + c_window_multiplier[nxt + 1] * t;
  window_deg := base_window * multiplier_val;

  dh_deg := abs(q_eff_h - s_h);
  IF dh_deg > 180.0 THEN
    dh_deg := 360.0 - dh_deg;
  END IF;
  IF dh_deg > window_deg THEN
    RETURN 0;
  END IF;

  -- Soft score: weighted quadratic distance wrapped in a Gaussian falloff.
  -- The hue term is scaled by C_q * C_s so hue differences only matter when
  -- both colors are chromatic (borrows CIEDE2000 structure).
  dh_rad := dh_deg * pi() / 180.0;
  d_l := hint_l - stored_l;
  d_c := q_c - s_c;
  hue_term := c_w_h * q_c * s_c * dh_rad * dh_rad;
  d_sq := c_w_l * d_l * d_l + c_w_c * d_c * d_c + hue_term;

  RETURN exp(-d_sq / c_sigma_sq);
END;
$$;

COMMENT ON FUNCTION public.lch_color_score(
  double precision, double precision, double precision,
  double precision, double precision, double precision
) IS
  'Perceptual similarity in [0, 1] between a query OKLab color and a stored palette OKLab color. Runs a two-stage OKLCh ranker: hard chroma/hue gates reject implausible matches, then a Gaussian-weighted quadratic distance scores survivors. Returns 0 when gated, or exp(-d²/0.16) otherwise. Constants mirror src/utils/colorLab/rankByColor.ts DEFAULT_CONFIG.';

-- PART 2: Drop the old OKLAB-Euclidean helper. No external callers — it was
-- used only inside `search_bookmarks_url_tag_scope`, which we recreate below.

DROP FUNCTION IF EXISTS public.color_matches_oklab(
  jsonb, double precision, double precision, double precision
);

-- PART 3: Drop any old overloads of `search_bookmarks_url_tag_scope` before
-- recreating the 6-parameter version. PostgreSQL treats signatures with
-- different parameter counts as distinct overloads, so we must drop each
-- variant we know about explicitly to avoid PostgREST ambiguity.

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(
  character varying, character varying, text[], bigint, jsonb
);
DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(
  character varying, character varying, text[], bigint, jsonb, text[]
);

-- PART 4: Recreate the 6-parameter search function with the new color predicate
-- and score expression. Signature, type_hints logic, text similarity, and
-- recency tiebreaker are unchanged from 20260413050000_type_hints_search.sql.

CREATE OR REPLACE FUNCTION public.search_bookmarks_url_tag_scope(
  search_text character varying DEFAULT '',
  url_scope character varying DEFAULT '',
  tag_scope text[] DEFAULT NULL,
  category_scope bigint DEFAULT NULL,
  color_hints jsonb DEFAULT '[]'::jsonb,
  type_hints text[] DEFAULT NULL
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
          AND LOWER(t.name) = ANY(SELECT LOWER(unnest(tag_scope)))
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
        FROM unnest(string_to_array(LOWER(btrim(search_text)), ' ')) AS token
        WHERE token <> ''
          AND NOT (
            token % ANY(
              string_to_array(
                LOWER(COALESCE(b.title::text, '') || ' ' || COALESCE(b.description, '')),
                ' '
              )
            )
            OR LOWER(COALESCE(b.url, '')) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
            OR EXISTS (
              SELECT 1
              FROM jsonb_each_text(COALESCE(b.meta_data, '{}'::jsonb)) AS x(key, value)
              WHERE key IN ('img_caption', 'image_caption', 'ocr')
                AND LOWER(value) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
            )
            OR EXISTS (
              SELECT 1
              FROM public.extract_keywords_text(b.meta_data->'image_keywords') AS kw
              WHERE LOWER(kw.keyword) LIKE '%' || replace(replace(token, '%', '\%'), '_', '\_') || '%' ESCAPE '\'
            )
          )
      )
    )
    AND
    (
      jsonb_array_length(color_hints) = 0
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(color_hints) AS hint
        WHERE
          EXISTS (
            SELECT 1
            FROM public.bookmark_tags bt
            JOIN public.tags t ON t.id = bt.tag_id
            WHERE bt.bookmark_id = b.id
              AND LOWER(t.name) = LOWER(hint->>'tag_name')
          )
          -- Quality floor (0.22) enforced via the positional-decayed score:
          -- at least one stored color must score >= 0.22 after decay.
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(
              COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
            ) WITH ORDINALITY AS c(val, pos)
            WHERE public.lch_color_score(
              (hint->>'l')::float, (hint->>'a')::float, (hint->>'b')::float,
              (c.val->>'l')::float, (c.val->>'a')::float, (c.val->>'b')::float
            ) * exp(-0.4 * (c.pos - 1)) >= 0.22
          )
      )
    )
    -- Type hints: match bookmark if it has a tag with that name OR image_keywords.type contains it
    AND
    (
      type_hints IS NULL
      OR array_length(type_hints, 1) IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(type_hints) AS hint
        WHERE
          EXISTS (
            SELECT 1
            FROM public.bookmark_tags bt
            JOIN public.tags t ON t.id = bt.tag_id
            WHERE bt.bookmark_id = b.id
              AND LOWER(t.name) = LOWER(hint)
          )
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(
              COALESCE(b.meta_data->'image_keywords'->'type', '[]'::jsonb)
            ) AS t_val
            WHERE LOWER(t_val) = LOWER(hint)
          )
      )
    )

  ORDER BY
    -- Tier 1: Color hint tag matches first
    CASE
      WHEN jsonb_array_length(color_hints) = 0 THEN 0
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements(color_hints) AS hint
        JOIN public.bookmark_tags bt ON bt.bookmark_id = b.id
        JOIN public.tags t ON t.id = bt.tag_id
        WHERE LOWER(t.name) = LOWER(hint->>'tag_name')
      ) THEN 1
      ELSE 0
    END DESC,
    -- Tier 2: Type hint precedence — tag match (2) > type-only match (1) > no match (0)
    CASE
      WHEN type_hints IS NULL OR array_length(type_hints, 1) IS NULL THEN 0
      WHEN EXISTS (
        SELECT 1
        FROM unnest(type_hints) AS hint
        JOIN public.bookmark_tags bt ON bt.bookmark_id = b.id
        JOIN public.tags t ON t.id = bt.tag_id
        WHERE LOWER(t.name) = LOWER(hint)
      ) THEN 2
      WHEN EXISTS (
        SELECT 1
        FROM unnest(type_hints) AS hint,
        jsonb_array_elements_text(
          COALESCE(b.meta_data->'image_keywords'->'type', '[]'::jsonb)
        ) AS t_val
        WHERE LOWER(t_val) = LOWER(hint)
      ) THEN 1
      ELSE 0
    END DESC,
    -- Tier 3: Similarity + color closeness (max over hint × palette of
    -- lch_color_score × positional decay exp(-0.4 * (pos - 1))).
    (
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
      END
      +
      CASE
        WHEN jsonb_array_length(color_hints) = 0 THEN 0
        ELSE COALESCE(
          (
            SELECT max(
              public.lch_color_score(
                (hint->>'l')::float, (hint->>'a')::float, (hint->>'b')::float,
                (c.val->>'l')::float, (c.val->>'a')::float, (c.val->>'b')::float
              ) * exp(-0.4 * (c.pos - 1))
            )
            FROM jsonb_array_elements(color_hints) AS hint
            CROSS JOIN jsonb_array_elements(
              COALESCE(b.meta_data->'image_keywords'->'colors', '[]'::jsonb)
            ) WITH ORDINALITY AS c(val, pos)
          ),
          0
        )
      END
    ) DESC,
    b.inserted_at DESC;
END;
$function$;

COMMENT ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) IS
  'Bookmark search with URL/tag/category/color/type filters. Color hints are an array of {tag_name,l,a,b} entries; a row matches a hint when it has a tag with that name OR at least one dominant image color scores >= 0.22 under the OKLCh two-stage ranker (lch_color_score × positional decay). Tag-matched rows sort above type-only rows; type-only rows sort above plain matches. Capped at 3 color hints by the route handler.';

-- PART 5: Restore access controls.

REVOKE EXECUTE ON FUNCTION public.lch_color_score(
  double precision, double precision, double precision,
  double precision, double precision, double precision
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lch_color_score(
  double precision, double precision, double precision,
  double precision, double precision, double precision
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lch_color_score(
  double precision, double precision, double precision,
  double precision, double precision, double precision
) TO anon;

REVOKE EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_bookmarks_url_tag_scope(character varying, character varying, text[], bigint, jsonb, text[]) TO anon;

-- PART 6: Smoke verification.
DO $$
DECLARE
  v_helper_exists int;
  v_search_exists int;
  v_old_helper int;
  v_overload_count int;
  v_red_vs_red double precision;
  v_red_vs_grey double precision;
  v_white_vs_white double precision;
  v_white_vs_red double precision;
BEGIN
  -- New helper exists
  SELECT COUNT(*) INTO v_helper_exists
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'lch_color_score';

  -- Search function present with expected 6-arg signature
  SELECT COUNT(*) INTO v_search_exists
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope'
    AND pg_get_function_identity_arguments(p.oid) =
      'search_text character varying, url_scope character varying, tag_scope text[], category_scope bigint, color_hints jsonb, type_hints text[]';

  -- No lingering overloads (PostgREST needs unambiguous resolution)
  SELECT COUNT(*) INTO v_overload_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_bookmarks_url_tag_scope';

  -- Old helper removed
  SELECT COUNT(*) INTO v_old_helper
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'color_matches_oklab';

  IF v_helper_exists = 0 THEN
    RAISE EXCEPTION 'lch_color_score helper not created';
  END IF;
  IF v_search_exists = 0 THEN
    RAISE EXCEPTION 'search_bookmarks_url_tag_scope with 6-arg signature not present';
  END IF;
  IF v_overload_count <> 1 THEN
    RAISE EXCEPTION 'search_bookmarks_url_tag_scope has % overloads, expected exactly 1', v_overload_count;
  END IF;
  IF v_old_helper <> 0 THEN
    RAISE EXCEPTION 'color_matches_oklab should have been dropped';
  END IF;

  -- Sanity: red query vs red stored should score high; red vs grey should be 0.
  -- OKLab approximate values:
  --   #FF0000 -> L=0.6279, a=0.2249, b=0.1258
  --   #CC0000 -> L=0.5299, a=0.1879, b=0.1057
  --   #808080 -> L=0.5999, a=0.0,    b=0.0
  --   #FFFFFF -> L=1.0,    a=0.0,    b=0.0
  v_red_vs_red := public.lch_color_score(0.6279, 0.2249, 0.1258, 0.5299, 0.1879, 0.1057);
  v_red_vs_grey := public.lch_color_score(0.6279, 0.2249, 0.1258, 0.5999, 0.0, 0.0);
  v_white_vs_white := public.lch_color_score(1.0, 0.0, 0.0, 1.0, 0.0, 0.0);
  v_white_vs_red := public.lch_color_score(1.0, 0.0, 0.0, 0.6279, 0.2249, 0.1258);

  IF v_red_vs_red < 0.6 THEN
    RAISE EXCEPTION 'lch_color_score: red query vs red stored expected >= 0.6, got %', v_red_vs_red;
  END IF;
  IF v_red_vs_grey <> 0 THEN
    RAISE EXCEPTION 'lch_color_score: red query vs grey stored expected 0 (chroma gate), got %', v_red_vs_grey;
  END IF;
  IF v_white_vs_white < 0.99 THEN
    RAISE EXCEPTION 'lch_color_score: white query vs white stored expected ~1.0, got %', v_white_vs_white;
  END IF;
  IF v_white_vs_red <> 0 THEN
    RAISE EXCEPTION 'lch_color_score: white query vs red stored expected 0 (achromatic chroma cap), got %', v_white_vs_red;
  END IF;

  RAISE NOTICE 'Verification passed: lch_color_score + 6-arg search function present; exactly 1 overload; smoke values red/grey/white consistent';
END $$;

COMMIT;
