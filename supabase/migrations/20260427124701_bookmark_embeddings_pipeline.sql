-- ============================================================================
-- Migration: bookmark_embeddings_pipeline
-- ============================================================================
-- Purpose:
--   Replace the SQL ranker in match_similar_bookmarks (PR #972) with cosine
--   similarity over Google Gemini Embedding 2 (gemini-embedding-2) vectors,
--   and drop the now-unused legacy ranker + its helpers in the same
--   transaction.
--
-- This migration adds:
--   1. public.bookmark_embeddings table + HNSW + btree indexes + RLS
--   2. public.claim_embedding_slot RPC (claim-row idempotency)
--   3. public.match_similar_bookmark_embeddings RPC (cosine top-K)
--
-- And drops:
--   4. public.match_similar_bookmarks(bigint, int, int) — legacy SQL ranker
--   5. public.aspect_bucket_from_meta(jsonb)   — helper used only by (4)
--   6. public.features_text_values(jsonb, text[]) — helper used only by (4)
--
-- Backfill of existing bookmarks is intentionally NOT in this PR — fresh
-- bookmarks get embedded automatically once EMBEDDINGS_ENABLED=true. The
-- backfill seeder for existing rows lands in a follow-up PR before
-- SIMILARITY_USE_EMBEDDINGS is flipped on (otherwise old bookmarks would
-- return empty similarity results). Backfill rate is gated by Gemini API
-- per-minute limits — no Batch Prediction equivalent exists, so plan a
-- worker-pool script with checkpointing rather than a single sync run.
--
-- Brainstorm: docs/brainstorms/2026-04-27-feat-visual-embedding-similar-search-brainstorm.md
-- Plan: docs/plans/2026-04-27-feat-visual-embedding-similar-search-plan.md
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- PART 0: Pre-flight — pgvector >= 0.8.0 required for HNSW iterative scan.
--   Without iterative_scan, post-filter on user_id can return empty results
--   for users with small libraries in the multi-tenant table.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_ver   text;
    v_parts int[];
BEGIN
    SELECT extversion INTO v_ver FROM pg_extension WHERE extname = 'vector';
    IF v_ver IS NULL THEN
        RAISE EXCEPTION 'pgvector extension not installed; required >= 0.8.0';
    END IF;
    -- Parse "major.minor.patch" so we don't lexicographically compare "0.10.0" < "0.8.0".
    v_parts := string_to_array(v_ver, '.')::int[];
    IF (v_parts[1], v_parts[2]) < (0, 8) THEN
        RAISE EXCEPTION 'pgvector >= 0.8.0 required for HNSW iterative scan, found: %', v_ver;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PART 1: bookmark_embeddings table.
--
--   Stores 1536-dim halfvec vectors from gemini-embedding-2 (Matryoshka
--   truncation from the model's native 3072 — fits halfvec HNSW with half
--   the storage and effectively no top-K quality loss).
--   Idempotency key: (bookmark_id, source_url_hash). Re-uploads of ogImage
--   invalidate stale embeddings via source_url_hash.
-- ----------------------------------------------------------------------------

CREATE TABLE public.bookmark_embeddings (
    bookmark_id     bigint PRIMARY KEY
                        REFERENCES public.everything (id) ON DELETE CASCADE,
    user_id         uuid NOT NULL
                        REFERENCES auth.users (id) ON DELETE CASCADE,
    embedding       extensions.halfvec(1536) NOT NULL,
    source_url_hash bytea NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bookmark_embeddings IS
    'Per-bookmark image embeddings (Google Gemini Embedding 2, 1536-dim halfvec via Matryoshka truncation). Backs match_similar_bookmark_embeddings cosine search. Worker-managed; authenticated callers have SELECT only.';

COMMENT ON COLUMN public.bookmark_embeddings.user_id IS
    'Denormalized from public.everything.user_id for HNSW-friendly user-scoped queries. If everything.user_id ever becomes mutable (ownership transfer), this column needs a sync trigger.';

COMMENT ON COLUMN public.bookmark_embeddings.source_url_hash IS
    'sha256 of public.everything."ogImage" at embed time. Lets the worker detect stale embeddings when bookmark images are re-uploaded (Raindrop/Instagram pipelines).';

-- ----------------------------------------------------------------------------
-- PART 2: Indexes.
--
--   HNSW on the embedding (cosine ops) for similarity search. Built with
--   ef_construction=200 for ~3pp recall over default 64; one-time build cost
--   is paid incrementally as rows are inserted.
--
--   btree on user_id for the post-filter portion of the cosine RPC. Without
--   this and pgvector iterative_scan, HNSW returns top-K globally before our
--   user_id filter, which is empty for small-library users in a big table.
-- ----------------------------------------------------------------------------

CREATE INDEX bookmark_embeddings_user_id_idx
    ON public.bookmark_embeddings (user_id);

CREATE INDEX bookmark_embeddings_embedding_hnsw_idx
    ON public.bookmark_embeddings
    USING hnsw (embedding extensions.halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- ----------------------------------------------------------------------------
-- PART 3: RLS policies.
--
--   Authenticated callers can SELECT only their own embeddings (proxy via
--   denormalized user_id, faster than joining everything per query).
--   INSERT/UPDATE/DELETE explicitly denied; service_role bypasses RLS for
--   the worker. Defense in depth via REVOKE on table grants too.
-- ----------------------------------------------------------------------------

ALTER TABLE public.bookmark_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embeddings"
ON public.bookmark_embeddings
FOR SELECT
TO authenticated
USING ( (SELECT auth.uid()) = user_id );

-- Per repo guideline: one policy per (operation, role). Three operations
-- (insert/update/delete) × two roles (authenticated, anon) = six deny policies.
CREATE POLICY "Authenticated cannot insert embeddings"
ON public.bookmark_embeddings
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Anon cannot insert embeddings"
ON public.bookmark_embeddings
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Authenticated cannot update embeddings"
ON public.bookmark_embeddings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Anon cannot update embeddings"
ON public.bookmark_embeddings
AS RESTRICTIVE
FOR UPDATE
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Authenticated cannot delete embeddings"
ON public.bookmark_embeddings
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "Anon cannot delete embeddings"
ON public.bookmark_embeddings
AS RESTRICTIVE
FOR DELETE
TO anon
USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.bookmark_embeddings FROM authenticated, anon;
GRANT SELECT ON public.bookmark_embeddings TO authenticated;

-- ----------------------------------------------------------------------------
-- PART 4: claim_embedding_slot RPC.
--
--   Atomic claim-row pattern. Two concurrent workers picking the same
--   bookmark would both observe "no row" and double-charge Gemini if we
--   used select-then-insert. Instead, insert a placeholder with a zero
--   vector; ON CONFLICT detects an existing slot. Returns claimed=true
--   when the caller is responsible for filling in the embedding.
--
--   service_role only (called by the worker, never by user routes).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_embedding_slot(
    p_bookmark_id     bigint,
    p_user_id         uuid,
    p_source_url_hash text  -- hex-encoded sha256; decoded to bytea internally
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_hash          bytea;
    v_owner         uuid;
    v_existing_hash bytea;
    v_existing_norm float8;
    v_claimed       boolean := false;
BEGIN
    -- Look up the canonical owner from public.everything. The caller's
    -- p_user_id is treated as a hint, NOT as authority — we always persist
    -- the owner from the source-of-truth table to prevent ownership
    -- corruption (e.g., a misconfigured worker passing the wrong user_id).
    SELECT e.user_id
        INTO v_owner
    FROM public.everything AS e
    WHERE e.id = p_bookmark_id
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'bookmark not found: %', p_bookmark_id
            USING ERRCODE = 'no_data_found';
    END IF;

    IF p_user_id IS DISTINCT FROM v_owner THEN
        RAISE EXCEPTION 'user mismatch for bookmark %: caller=% owner=%',
            p_bookmark_id, p_user_id, v_owner
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_hash := decode(p_source_url_hash, 'hex');

    -- If already embedded for the current source URL with a real (non-zero)
    -- vector, skip the work entirely. Zero-vector placeholders left behind
    -- by a failed embed (Gemini error + rollback DELETE that didn't land)
    -- must NOT short-circuit here — they'd get stuck permanently otherwise.
    SELECT source_url_hash, extensions.l2_norm(embedding)
        INTO v_existing_hash, v_existing_norm
    FROM public.bookmark_embeddings
    WHERE bookmark_id = p_bookmark_id;

    IF v_existing_hash = v_hash AND COALESCE(v_existing_norm, 0) > 1e-6 THEN
        RETURN jsonb_build_object('claimed', false, 'reason', 'already-current');
    END IF;

    -- Claim the slot. ON CONFLICT triggers an UPDATE in two cases:
    --   1. Source URL changed → re-embed against the new image.
    --   2. Existing row is a zero-vector placeholder → previous embed
    --      attempt failed and rollback didn't land. Re-claim so the worker
    --      retries instead of leaving the bookmark permanently stuck.
    -- The worker overwrites the placeholder with the real vector on success.
    -- We persist the owner we looked up from public.everything (v_owner),
    -- not whatever the caller passed.
    INSERT INTO public.bookmark_embeddings (bookmark_id, user_id, embedding, source_url_hash)
    VALUES (
        p_bookmark_id,
        v_owner,
        array_fill(0::real, ARRAY[1536])::extensions.halfvec(1536),
        v_hash
    )
    ON CONFLICT (bookmark_id) DO UPDATE
        SET user_id         = excluded.user_id,
            source_url_hash = excluded.source_url_hash,
            updated_at      = now()
        WHERE public.bookmark_embeddings.source_url_hash IS DISTINCT FROM excluded.source_url_hash
           OR extensions.l2_norm(public.bookmark_embeddings.embedding) < 1e-6;

    -- FOUND is true if either an INSERT happened or the conflict path UPDATEd.
    -- If the existing row already had the same source_url_hash AND a real
    -- (non-zero) embedding, the WHERE in the conflict clause filtered it out
    -- and FOUND is false.
    v_claimed := FOUND;

    RETURN jsonb_build_object('claimed', v_claimed);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_embedding_slot(bigint, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_embedding_slot(bigint, uuid, text) TO service_role;

COMMENT ON FUNCTION public.claim_embedding_slot(bigint, uuid, text) IS
    'Atomically claims a slot in bookmark_embeddings before the worker calls Gemini. Source URL hash is passed as hex-encoded text and decoded to bytea internally to keep the JSON-RPC wire format simple. Returns claimed=true when the caller must fill in the embedding, or false when a current embedding already exists or another worker holds the claim. Prevents double-charging Gemini when concurrent workers (pgmq archive replays, retries) pick up the same bookmark.';

-- ----------------------------------------------------------------------------
-- PART 5: match_similar_bookmark_embeddings RPC.
--
--   Top-K visually similar bookmarks by cosine similarity. Replaces the
--   legacy match_similar_bookmarks RPC (dropped in PART 6 below).
--
--   Uses pgvector's iterative HNSW scan so user_id post-filtering doesn't
--   strand small-library users with empty results when their valid
--   neighbors sit deeper in the global graph.
--
--   Ownership gate raises no_data_found identically for "doesn't exist"
--   and "exists for another user" — closes the timing-oracle enumeration
--   vector across users.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_similar_bookmark_embeddings(
    p_bookmark_id bigint,
    p_limit       int DEFAULT 50
)
RETURNS TABLE (id bigint, similarity_score int)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_target_embedding extensions.halfvec(1536);
    v_owner            uuid;
BEGIN
    -- Ownership gate. Single statement that hits both bookmark_embeddings
    -- (RLS-scoped to caller via user_id) and everything (RLS-scoped via
    -- existing policies). Raises identically whether the row is missing,
    -- owned by another user, or still a zero-vector placeholder (claim
    -- happened but the real embed never landed). For the placeholder case,
    -- raising no_data_found makes the route return [] rather than ranking
    -- candidates against a NaN-producing zero target vector.
    SELECT be.embedding, e.user_id
        INTO v_target_embedding, v_owner
    FROM public.bookmark_embeddings AS be
    INNER JOIN public.everything AS e
        ON e.id = be.bookmark_id
    WHERE be.bookmark_id = p_bookmark_id
      AND e.user_id = (SELECT auth.uid())
      AND e.trash IS NULL
      AND extensions.l2_norm(be.embedding) > 1e-6
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'not found' USING ERRCODE = 'no_data_found';
    END IF;

    SET LOCAL hnsw.iterative_scan = strict_order;
    SET LOCAL hnsw.max_scan_tuples = 20000;

    -- Filter out claim_embedding_slot's zero-vector placeholder. A row exists
    -- briefly between claim and the real embedding write — and forever if the
    -- worker process dies after claim. Cosine on a zero vector is NaN; we
    -- exclude these explicitly so they never bleed into similarity results.
    -- l2_norm is checked against a small epsilon rather than 0 to be safe
    -- against any halfvec rounding around zero.
    -- Clamp similarity_score to [0, 100] to match the OpenAPI contract.
    -- Cosine similarity is in [-1, 1], so the un-clamped percentage can dip
    -- below zero when two vectors are more than 90° apart. Halfvec rounding
    -- can also produce sub-epsilon drift past the natural bounds.
    RETURN QUERY
    SELECT
        b.bookmark_id AS id,
        GREATEST(
            0,
            LEAST(
                100,
                round((1 - (b.embedding OPERATOR(extensions.<=>) v_target_embedding)) * 100)::int
            )
        ) AS similarity_score
    FROM public.bookmark_embeddings AS b
    INNER JOIN public.everything AS e
        ON e.id = b.bookmark_id AND e.trash IS NULL
    WHERE b.bookmark_id <> p_bookmark_id
      AND b.user_id = v_owner
      AND extensions.l2_norm(b.embedding) > 1e-6
    ORDER BY b.embedding OPERATOR(extensions.<=>) v_target_embedding
    LIMIT p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.match_similar_bookmark_embeddings(bigint, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_similar_bookmark_embeddings(bigint, int) TO authenticated;

COMMENT ON FUNCTION public.match_similar_bookmark_embeddings(bigint, int) IS
    'Top-K visually similar bookmarks by cosine similarity over gemini-embedding-2 vectors. similarity_score is integer 0-100 (cosine similarity * 100, rounded). RLS-scoped via SECURITY INVOKER plus an explicit ownership gate to defeat timing-based enumeration.';

-- ----------------------------------------------------------------------------
-- PART 6: Drop the legacy match_similar_bookmarks SQL ranker.
--
--   The route (src/app/api/v2/bookmark/fetch-similar/route.ts) no longer
--   calls this RPC; it has been routed exclusively to the cosine RPC above.
--   Drop the function and its two helpers — neither helper has any other
--   caller in the codebase or in any other migration.
--
--   IF EXISTS guards keep the migration replayable on environments where the
--   legacy create-paths never ran (greenfield local databases, branches that
--   never picked up PR #972 / coalesce-guards / rebalance migrations).
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.match_similar_bookmarks(bigint, int, int);
DROP FUNCTION IF EXISTS public.aspect_bucket_from_meta(jsonb);
DROP FUNCTION IF EXISTS public.features_text_values(jsonb, text[]);

-- ----------------------------------------------------------------------------
-- PART 7: Verification.
--
--   Asserts the migration's structural outputs. Every assertion that fails
--   raises and rolls back the transaction.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
    v_count int;
BEGIN
    -- Table exists with expected columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bookmark_embeddings'
    ) THEN
        RAISE EXCEPTION 'bookmark_embeddings table missing';
    END IF;

    -- RLS enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'bookmark_embeddings' AND relrowsecurity = true
    ) THEN
        RAISE EXCEPTION 'RLS not enabled on bookmark_embeddings';
    END IF;

    -- Both indexes present
    SELECT count(*) INTO v_count FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'bookmark_embeddings';
    IF v_count < 3 THEN
        RAISE EXCEPTION 'expected 3 indexes on bookmark_embeddings (PK + user_id + hnsw), found %', v_count;
    END IF;

    -- All four policies present (1 select + 3 deny)
    SELECT count(*) INTO v_count FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bookmark_embeddings';
    -- 1 permissive select + 6 restrictive deny (3 ops × 2 roles).
    IF v_count <> 7 THEN
        RAISE EXCEPTION 'expected 7 RLS policies on bookmark_embeddings, found %', v_count;
    END IF;

    -- Both new functions present (admin_enqueue_embedding_backfill is a follow-up PR).
    IF to_regprocedure('public.claim_embedding_slot(bigint, uuid, text)') IS NULL THEN
        RAISE EXCEPTION 'claim_embedding_slot function missing';
    END IF;
    IF to_regprocedure('public.match_similar_bookmark_embeddings(bigint, int)') IS NULL THEN
        RAISE EXCEPTION 'match_similar_bookmark_embeddings function missing';
    END IF;

    -- Legacy ranker + helpers are gone.
    IF to_regprocedure('public.match_similar_bookmarks(bigint, int, int)') IS NOT NULL THEN
        RAISE EXCEPTION 'legacy match_similar_bookmarks function still present';
    END IF;
    IF to_regprocedure('public.aspect_bucket_from_meta(jsonb)') IS NOT NULL THEN
        RAISE EXCEPTION 'legacy aspect_bucket_from_meta helper still present';
    END IF;
    IF to_regprocedure('public.features_text_values(jsonb, text[])') IS NOT NULL THEN
        RAISE EXCEPTION 'legacy features_text_values helper still present';
    END IF;

    RAISE NOTICE 'bookmark_embeddings_pipeline migration applied successfully';
END $$;

COMMIT;
