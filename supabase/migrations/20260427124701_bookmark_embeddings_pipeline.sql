-- ============================================================================
-- Migration: bookmark_embeddings_pipeline
-- ============================================================================
-- Purpose:
--   Add image-embedding-based visual similarity. Replaces the SQL ranker in
--   match_similar_bookmarks (PR #972) with cosine similarity over Vertex AI
--   multimodalembedding@001 vectors.
--
-- Shipped behind two env flags:
--   - EMBEDDINGS_ENABLED          gates the worker (write path)
--   - SIMILARITY_USE_EMBEDDINGS   gates the route (read path)
-- Both default false so this migration is a no-op until ops flips the flags.
-- The legacy match_similar_bookmarks RPC stays alive — cleanup is a follow-up
-- migration scheduled 14 days post-cutover.
--
-- This migration adds:
--   1. public.bookmark_embeddings table + HNSW + btree indexes + RLS
--   2. public.claim_embedding_slot RPC (claim-row idempotency)
--   3. public.match_similar_bookmark_embeddings RPC (cosine top-K)
--
-- Backfill of existing bookmarks is intentionally NOT in this PR — fresh
-- bookmarks get embedded automatically once EMBEDDINGS_ENABLED=true. The
-- backfill seeder for existing rows lands in a follow-up PR before
-- SIMILARITY_USE_EMBEDDINGS is flipped on (otherwise old bookmarks would
-- return empty similarity results).
--
-- Brainstorm: docs/brainstorms/2026-04-27-feat-visual-embedding-similar-search-brainstorm.md
-- Plan: docs/plans/2026-04-27-feat-visual-embedding-similar-search-plan.md
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- PART 0: Pre-flight — pgvector >= 0.8.0 required for HNSW iterative scan.
--   Without iterative_scan, post-filter on user_id can return empty results
--   for users with small libraries in the multi-tenant table.
-- ----------------------------------------------------------------------------

do $$
declare
    v_ver   text;
    v_parts int[];
begin
    select extversion into v_ver from pg_extension where extname = 'vector';
    if v_ver is null then
        raise exception 'pgvector extension not installed; required >= 0.8.0';
    end if;
    -- Parse "major.minor.patch" so we don't lexicographically compare "0.10.0" < "0.8.0".
    v_parts := string_to_array(v_ver, '.')::int[];
    if (v_parts[1], v_parts[2]) < (0, 8) then
        raise exception 'pgvector >= 0.8.0 required for HNSW iterative scan, found: %', v_ver;
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- PART 1: bookmark_embeddings table.
--
--   Stores 1408-dim halfvec vectors from multimodalembedding@001.
--   Idempotency key: (bookmark_id, model_version, source_url_hash).
--   Re-uploads of ogImage invalidate stale embeddings via source_url_hash.
-- ----------------------------------------------------------------------------

create table public.bookmark_embeddings (
    bookmark_id     bigint primary key
                        references public.everything (id) on delete cascade,
    user_id         uuid not null
                        references auth.users (id) on delete cascade,
    embedding       extensions.halfvec(1408) not null,
    model_version   text not null default 'multimodalembedding@001',
    source_url_hash bytea not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table public.bookmark_embeddings is
    'Per-bookmark image embeddings (Vertex AI multimodalembedding@001, 1408-dim halfvec). Backs match_similar_bookmark_embeddings cosine search. Worker-managed; authenticated callers have SELECT only.';

comment on column public.bookmark_embeddings.user_id is
    'Denormalized from public.everything.user_id for HNSW-friendly user-scoped queries. If everything.user_id ever becomes mutable (ownership transfer), this column needs a sync trigger.';

comment on column public.bookmark_embeddings.source_url_hash is
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

create index bookmark_embeddings_user_id_idx
    on public.bookmark_embeddings (user_id);

create index bookmark_embeddings_embedding_hnsw_idx
    on public.bookmark_embeddings
    using hnsw (embedding extensions.halfvec_cosine_ops)
    with (m = 16, ef_construction = 200);

-- ----------------------------------------------------------------------------
-- PART 3: RLS policies.
--
--   Authenticated callers can SELECT only their own embeddings (proxy via
--   denormalized user_id, faster than joining everything per query).
--   INSERT/UPDATE/DELETE explicitly denied; service_role bypasses RLS for
--   the worker. Defense in depth via REVOKE on table grants too.
-- ----------------------------------------------------------------------------

alter table public.bookmark_embeddings enable row level security;

create policy "Users can view own embeddings"
on public.bookmark_embeddings
for select
to authenticated
using ( (select auth.uid()) = user_id );

-- Per repo guideline: one policy per (operation, role). Three operations
-- (insert/update/delete) × two roles (authenticated, anon) = six deny policies.
create policy "Authenticated cannot insert embeddings"
on public.bookmark_embeddings
as restrictive
for insert
to authenticated
with check (false);

create policy "Anon cannot insert embeddings"
on public.bookmark_embeddings
as restrictive
for insert
to anon
with check (false);

create policy "Authenticated cannot update embeddings"
on public.bookmark_embeddings
as restrictive
for update
to authenticated
using (false)
with check (false);

create policy "Anon cannot update embeddings"
on public.bookmark_embeddings
as restrictive
for update
to anon
using (false)
with check (false);

create policy "Authenticated cannot delete embeddings"
on public.bookmark_embeddings
as restrictive
for delete
to authenticated
using (false);

create policy "Anon cannot delete embeddings"
on public.bookmark_embeddings
as restrictive
for delete
to anon
using (false);

revoke insert, update, delete on public.bookmark_embeddings from authenticated, anon;
grant select on public.bookmark_embeddings to authenticated;

-- ----------------------------------------------------------------------------
-- PART 4: claim_embedding_slot RPC.
--
--   Atomic claim-row pattern. Two concurrent workers picking the same
--   bookmark would both observe "no row" and double-charge Vertex if we
--   used select-then-insert. Instead, insert a placeholder with a zero
--   vector; ON CONFLICT detects an existing slot. Returns claimed=true
--   when the caller is responsible for filling in the embedding.
--
--   service_role only (called by the worker, never by user routes).
-- ----------------------------------------------------------------------------

create or replace function public.claim_embedding_slot(
    p_bookmark_id     bigint,
    p_user_id         uuid,
    p_source_url_hash text  -- hex-encoded sha256; decoded to bytea internally
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_hash             bytea;
    v_owner            uuid;
    v_existing_hash    bytea;
    v_existing_version text;
    v_claimed          boolean := false;
begin
    -- Look up the canonical owner from public.everything. The caller's
    -- p_user_id is treated as a hint, NOT as authority — we always persist
    -- the owner from the source-of-truth table to prevent ownership
    -- corruption (e.g., a misconfigured worker passing the wrong user_id).
    select e.user_id
        into v_owner
    from public.everything as e
    where e.id = p_bookmark_id
    limit 1;

    if not found then
        raise exception 'bookmark not found: %', p_bookmark_id
            using errcode = 'no_data_found';
    end if;

    if p_user_id is distinct from v_owner then
        raise exception 'user mismatch for bookmark %: caller=% owner=%',
            p_bookmark_id, p_user_id, v_owner
            using errcode = 'insufficient_privilege';
    end if;

    v_hash := decode(p_source_url_hash, 'hex');

    -- If already embedded with current source + model, skip the work entirely.
    select source_url_hash, model_version
        into v_existing_hash, v_existing_version
    from public.bookmark_embeddings
    where bookmark_id = p_bookmark_id;

    if v_existing_hash = v_hash
       and v_existing_version = 'multimodalembedding@001' then
        return jsonb_build_object('claimed', false, 'reason', 'already-current');
    end if;

    -- Claim the slot. ON CONFLICT updates the source_url_hash so a changed
    -- image triggers re-embedding; the worker overwrites the placeholder
    -- with the real vector on success. We persist the owner we looked up
    -- from public.everything (v_owner), not whatever the caller passed.
    insert into public.bookmark_embeddings (bookmark_id, user_id, embedding, source_url_hash)
    values (
        p_bookmark_id,
        v_owner,
        array_fill(0::real, array[1408])::extensions.halfvec(1408),
        v_hash
    )
    on conflict (bookmark_id) do update
        set user_id         = excluded.user_id,
            source_url_hash = excluded.source_url_hash,
            updated_at      = now()
        where public.bookmark_embeddings.source_url_hash is distinct from excluded.source_url_hash;

    -- FOUND is true if either an INSERT happened or the conflict path UPDATEd.
    -- If the existing row already had the same source_url_hash, the WHERE in
    -- the conflict clause filtered it out and FOUND is false.
    v_claimed := found;

    return jsonb_build_object('claimed', v_claimed);
end;
$$;

revoke execute on function public.claim_embedding_slot(bigint, uuid, text) from public;
grant execute on function public.claim_embedding_slot(bigint, uuid, text) to service_role;

comment on function public.claim_embedding_slot(bigint, uuid, text) is
    'Atomically claims a slot in bookmark_embeddings before the worker calls Vertex. Source URL hash is passed as hex-encoded text and decoded to bytea internally to keep the JSON-RPC wire format simple. Returns claimed=true when the caller must fill in the embedding, or false when a current embedding already exists or another worker holds the claim. Prevents double-charging Vertex when concurrent workers (pgmq archive replays, retries) pick up the same bookmark.';

-- ----------------------------------------------------------------------------
-- PART 5: match_similar_bookmark_embeddings RPC.
--
--   Top-K visually similar bookmarks by cosine similarity. Replaces
--   match_similar_bookmarks (kept alive until follow-up cleanup migration).
--
--   Uses pgvector's iterative HNSW scan so user_id post-filtering doesn't
--   strand small-library users with empty results when their valid
--   neighbors sit deeper in the global graph.
--
--   Ownership gate raises no_data_found identically for "doesn't exist"
--   and "exists for another user" — closes the timing-oracle enumeration
--   vector across users.
-- ----------------------------------------------------------------------------

create or replace function public.match_similar_bookmark_embeddings(
    p_bookmark_id bigint,
    p_limit       int default 10
)
returns table (id bigint, similarity_score int)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
    v_target_embedding extensions.halfvec(1408);
    v_owner            uuid;
begin
    -- Ownership gate. Single statement that hits both bookmark_embeddings
    -- (RLS-scoped to caller via user_id) and everything (RLS-scoped via
    -- existing policies). Raises identically whether the row is missing
    -- or owned by another user.
    select be.embedding, e.user_id
        into v_target_embedding, v_owner
    from public.bookmark_embeddings as be
    inner join public.everything as e
        on e.id = be.bookmark_id
    where be.bookmark_id = p_bookmark_id
      and e.user_id = (select auth.uid())
      and e.trash is null
    limit 1;

    if not found then
        raise exception 'not found' using errcode = 'no_data_found';
    end if;

    set local hnsw.iterative_scan = strict_order;
    set local hnsw.max_scan_tuples = 20000;

    -- Filter out claim_embedding_slot's zero-vector placeholder. A row exists
    -- briefly between claim and the real embedding write — and forever if the
    -- worker process dies after claim. Cosine on a zero vector is NaN; we
    -- exclude these explicitly so they never bleed into similarity results.
    -- l2_norm is checked against a small epsilon rather than 0 because the
    -- halfvec → vector cast can introduce sub-epsilon rounding artifacts.
    return query
    select
        b.bookmark_id as id,
        round((1 - (b.embedding operator(extensions.<=>) v_target_embedding)) * 100)::int as similarity_score
    from public.bookmark_embeddings as b
    inner join public.everything as e
        on e.id = b.bookmark_id and e.trash is null
    where b.bookmark_id <> p_bookmark_id
      and b.user_id = v_owner
      and extensions.l2_norm(b.embedding::extensions.vector) > 1e-6
    order by b.embedding operator(extensions.<=>) v_target_embedding
    limit p_limit;
end;
$$;

revoke execute on function public.match_similar_bookmark_embeddings(bigint, int) from public;
grant execute on function public.match_similar_bookmark_embeddings(bigint, int) to authenticated;

comment on function public.match_similar_bookmark_embeddings(bigint, int) is
    'Top-K visually similar bookmarks by cosine similarity over multimodalembedding@001 vectors. similarity_score is integer 0-100 (cosine similarity * 100, rounded). RLS-scoped via SECURITY INVOKER plus an explicit ownership gate to defeat timing-based enumeration.';

-- ----------------------------------------------------------------------------
-- PART 6: Verification.
--
--   Asserts the migration's structural outputs. Every assertion that fails
--   raises and rolls back the transaction.
-- ----------------------------------------------------------------------------

do $$
declare
    v_count int;
begin
    -- Table exists with expected columns
    if not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'bookmark_embeddings'
    ) then
        raise exception 'bookmark_embeddings table missing';
    end if;

    -- RLS enabled
    if not exists (
        select 1 from pg_class
        where relname = 'bookmark_embeddings' and relrowsecurity = true
    ) then
        raise exception 'RLS not enabled on bookmark_embeddings';
    end if;

    -- Both indexes present
    select count(*) into v_count from pg_indexes
    where schemaname = 'public' and tablename = 'bookmark_embeddings';
    if v_count < 3 then
        raise exception 'expected 3 indexes on bookmark_embeddings (PK + user_id + hnsw), found %', v_count;
    end if;

    -- All four policies present (1 select + 3 deny)
    select count(*) into v_count from pg_policies
    where schemaname = 'public' and tablename = 'bookmark_embeddings';
    -- 1 permissive select + 6 restrictive deny (3 ops × 2 roles).
    if v_count <> 7 then
        raise exception 'expected 7 RLS policies on bookmark_embeddings, found %', v_count;
    end if;

    -- Both new functions present (admin_enqueue_embedding_backfill is a follow-up PR).
    if to_regprocedure('public.claim_embedding_slot(bigint, uuid, text)') is null then
        raise exception 'claim_embedding_slot function missing';
    end if;
    if to_regprocedure('public.match_similar_bookmark_embeddings(bigint, int)') is null then
        raise exception 'match_similar_bookmark_embeddings function missing';
    end if;

    raise notice 'bookmark_embeddings_pipeline migration applied successfully';
end $$;

commit;
