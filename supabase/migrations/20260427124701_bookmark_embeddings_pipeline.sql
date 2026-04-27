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
--   1. profiles.ai_enrichment_enabled (GDPR opt-out)
--   2. public.bookmark_embeddings table + HNSW + btree indexes + RLS
--   3. public.claim_embedding_slot RPC (claim-row idempotency)
--   4. public.admin_enqueue_embedding_backfill RPC (cron-driven backfill)
--   5. public.match_similar_bookmark_embeddings RPC (cosine top-K)
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
    v_ver text;
begin
    select extversion into v_ver from pg_extension where extname = 'vector';
    if v_ver is null then
        raise exception 'pgvector extension not installed; required >= 0.8.0';
    end if;
    if v_ver < '0.8.0' then
        raise exception 'pgvector >= 0.8.0 required for HNSW iterative scan, found: %', v_ver;
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- PART 1: GDPR opt-out toggle on profiles.
--   Worker honors this flag before sending images to Vertex.
-- ----------------------------------------------------------------------------

alter table public.profiles
    add column if not exists ai_enrichment_enabled boolean not null default true;

comment on column public.profiles.ai_enrichment_enabled is
    'When false, the AI enrichment worker skips Vertex embedding for this user''s bookmarks. GDPR opt-out toggle.';

-- ----------------------------------------------------------------------------
-- PART 2: bookmark_embeddings table.
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
-- PART 3: Indexes.
--
--   HNSW on the embedding (cosine ops) for similarity search. Built with
--   ef_construction=200 for ~3pp recall over default 64; one-time build cost
--   is paid during incremental backfill inserts.
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
-- PART 4: RLS policies.
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

create policy "Authenticated cannot insert embeddings"
on public.bookmark_embeddings
as restrictive
for insert
to authenticated, anon
with check (false);

create policy "Authenticated cannot update embeddings"
on public.bookmark_embeddings
as restrictive
for update
to authenticated, anon
using (false)
with check (false);

create policy "Authenticated cannot delete embeddings"
on public.bookmark_embeddings
as restrictive
for delete
to authenticated, anon
using (false);

revoke insert, update, delete on public.bookmark_embeddings from authenticated, anon;
grant select on public.bookmark_embeddings to authenticated;

-- ----------------------------------------------------------------------------
-- PART 5: claim_embedding_slot RPC.
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
    p_source_url_hash bytea
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_existing_hash    bytea;
    v_existing_version text;
    v_claimed          boolean := false;
begin
    -- If already embedded with current source + model, skip the work entirely.
    select source_url_hash, model_version
        into v_existing_hash, v_existing_version
    from public.bookmark_embeddings
    where bookmark_id = p_bookmark_id;

    if v_existing_hash = p_source_url_hash
       and v_existing_version = 'multimodalembedding@001' then
        return jsonb_build_object('claimed', false, 'reason', 'already-current');
    end if;

    -- Otherwise claim the slot. ON CONFLICT updates the source_url_hash so a
    -- changed image triggers re-embedding; the worker overwrites the placeholder
    -- with the real vector on success.
    insert into public.bookmark_embeddings (bookmark_id, user_id, embedding, source_url_hash)
    values (
        p_bookmark_id,
        p_user_id,
        array_fill(0::real, array[1408])::extensions.halfvec(1408),
        p_source_url_hash
    )
    on conflict (bookmark_id) do update
        set source_url_hash = excluded.source_url_hash,
            updated_at      = now()
        where public.bookmark_embeddings.source_url_hash is distinct from excluded.source_url_hash;

    -- FOUND is true if either an INSERT happened or the conflict path UPDATEd.
    -- If the existing row already had the same source_url_hash, the WHERE in
    -- the conflict clause filtered it out and FOUND is false.
    v_claimed := found;

    return jsonb_build_object('claimed', v_claimed);
end;
$$;

revoke execute on function public.claim_embedding_slot(bigint, uuid, bytea) from public;
grant execute on function public.claim_embedding_slot(bigint, uuid, bytea) to service_role;

comment on function public.claim_embedding_slot(bigint, uuid, bytea) is
    'Atomically claims a slot in bookmark_embeddings before the worker calls Vertex. Returns claimed=true when the caller must fill in the embedding, or false when a current embedding already exists or another worker holds the claim. Closes the double-charge race during backfill replays.';

-- ----------------------------------------------------------------------------
-- PART 6: admin_enqueue_embedding_backfill RPC.
--
--   Cron-driven backfill seeder. Selects N image-bearing bookmarks lacking
--   embeddings (and not opted out via profiles.ai_enrichment_enabled) and
--   sends them to the existing ai-embeddings pgmq queue. Synthesizes the
--   full payload shape that the existing worker's Zod schema expects.
--
--   Transactional advisory lock prevents concurrent invocations from
--   enqueueing overlapping batches (which would double-charge Vertex on
--   the worker side via the claim RPC's race window).
-- ----------------------------------------------------------------------------

create or replace function public.admin_enqueue_embedding_backfill(
    p_batch_size int default 500
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_count int := 0;
    v_row   record;
begin
    if p_batch_size <= 0 or p_batch_size > 5000 then
        raise exception 'p_batch_size out of range (1-5000), got %', p_batch_size;
    end if;

    -- Serialize concurrent invocations within the transaction.
    if not pg_try_advisory_xact_lock(hashtext('embedding_backfill')) then
        return jsonb_build_object('skipped', true, 'reason', 'concurrent-invocation');
    end if;

    for v_row in
        select
            e.id,
            e.user_id,
            e."ogImage",
            e.url,
            coalesce(e.meta_data, '{}'::jsonb) as meta_data,
            coalesce(e.url ilike '%instagram.com%', false) as is_instagram,
            coalesce(e.url ilike '%raindrop.io%',   false) as is_raindrop,
            coalesce(e.url ilike '%twitter.com%',   false) as is_twitter
        from public.everything as e
        left join public.bookmark_embeddings as be
            on be.bookmark_id = e.id
        left join public.profiles as p
            on p.id = e.user_id
        where e."ogImage" is not null
          and e.trash is null
          and be.bookmark_id is null
          and coalesce(p.ai_enrichment_enabled, true) = true
        order by e.id
        limit p_batch_size
    loop
        perform pgmq.send(
            'ai-embeddings',
            jsonb_build_object(
                'id',                  v_row.id,
                'user_id',             v_row.user_id,
                'ogImage',             v_row."ogImage",
                'url',                 v_row.url,
                'queue_name',          'ai-embeddings',
                'isInstagramBookmark', v_row.is_instagram,
                'isRaindropBookmark',  v_row.is_raindrop,
                'isTwitterBookmark',   v_row.is_twitter,
                'message', jsonb_build_object(
                    'msg_id',  0,
                    'message', jsonb_build_object('meta_data', v_row.meta_data)
                )
            )
        );
        v_count := v_count + 1;
    end loop;

    return jsonb_build_object('enqueued', v_count);
end;
$$;

revoke execute on function public.admin_enqueue_embedding_backfill(int) from public;
grant execute on function public.admin_enqueue_embedding_backfill(int) to service_role;

comment on function public.admin_enqueue_embedding_backfill(int) is
    'Bulk-enqueues image-bearing bookmarks lacking embeddings into the ai-embeddings pgmq queue. Designed for cron-driven backfill. Honors profiles.ai_enrichment_enabled. Synthesizes the worker''s expected nested payload shape so no schema change is needed in the consumer.';

-- ----------------------------------------------------------------------------
-- PART 7: match_similar_bookmark_embeddings RPC.
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
stable
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

    return query
    select
        b.bookmark_id as id,
        round((1 - (b.embedding <=> v_target_embedding)) * 100)::int as similarity_score
    from public.bookmark_embeddings as b
    inner join public.everything as e
        on e.id = b.bookmark_id and e.trash is null
    where b.bookmark_id <> p_bookmark_id
      and b.user_id = v_owner
    order by b.embedding <=> v_target_embedding
    limit p_limit;
end;
$$;

revoke execute on function public.match_similar_bookmark_embeddings(bigint, int) from public;
grant execute on function public.match_similar_bookmark_embeddings(bigint, int) to authenticated;

comment on function public.match_similar_bookmark_embeddings(bigint, int) is
    'Top-K visually similar bookmarks by cosine similarity over multimodalembedding@001 vectors. similarity_score is integer 0-100 (cosine similarity * 100, rounded). RLS-scoped via SECURITY INVOKER plus an explicit ownership gate to defeat timing-based enumeration.';

-- ----------------------------------------------------------------------------
-- PART 8: Verification.
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
    if v_count <> 4 then
        raise exception 'expected 4 RLS policies on bookmark_embeddings, found %', v_count;
    end if;

    -- All three new functions present
    if to_regprocedure('public.claim_embedding_slot(bigint, uuid, bytea)') is null then
        raise exception 'claim_embedding_slot function missing';
    end if;
    if to_regprocedure('public.admin_enqueue_embedding_backfill(int)') is null then
        raise exception 'admin_enqueue_embedding_backfill function missing';
    end if;
    if to_regprocedure('public.match_similar_bookmark_embeddings(bigint, int)') is null then
        raise exception 'match_similar_bookmark_embeddings function missing';
    end if;

    -- Profiles toggle column added
    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name   = 'profiles'
          and column_name  = 'ai_enrichment_enabled'
    ) then
        raise exception 'profiles.ai_enrichment_enabled column missing';
    end if;

    raise notice 'bookmark_embeddings_pipeline migration applied successfully';
end $$;

commit;
