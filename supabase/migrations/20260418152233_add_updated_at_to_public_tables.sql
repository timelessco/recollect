-- ============================================================================
-- Migration: Add updated_at across public tables
-- ============================================================================
-- Purpose:
--   Introduce a uniform row-update timestamp on the five mutable public
--   tables so downstream consumers (delta-sync clients, observability,
--   future indexes) can filter and order by "what changed last". Also
--   backfills profiles.created_at so every profile row carries a complete
--   pair of timestamps.
--
-- Affected tables:
--   - public.everything         (adds updated_at; backfill from inserted_at)
--   - public.categories         (adds updated_at; backfill from created_at)
--   - public.profiles           (adds created_at + updated_at;
--                                 created_at from auth.users.created_at)
--   - public.tags               (adds updated_at; backfill from created_at)
--   - public.shared_categories  (adds updated_at; backfill from created_at)
--
-- Junction tables (bookmark_categories, bookmark_tags) are deliberately
-- left alone: rows are only inserted and deleted, so an updated_at would
-- never advance past creation time. everything.inserted_at is NOT renamed
-- because it is the indexed sort key for several search RPCs.
--
-- Trigger function:
--   public.touch_updated_at() — shared plpgsql, security invoker, attached
--   to each target table as BEFORE UPDATE FOR EACH ROW. Stamps
--   NEW.updated_at = now() unconditionally on every UPDATE; the
--   WHEN (OLD.* IS DISTINCT FROM NEW.*) guard is intentionally out of
--   scope for this round.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Pre-flight assertions
-- ============================================================================
-- Verify each creation column we intend to backfill from still exists under
-- the expected name, and that none of the columns we are about to add
-- already exist (which would indicate a partial prior apply).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'everything' AND column_name = 'inserted_at'
  ) THEN
    RAISE EXCEPTION 'expected public.everything.inserted_at to exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'created_at'
  ) THEN
    RAISE EXCEPTION 'expected public.categories.created_at to exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'created_at'
  ) THEN
    RAISE EXCEPTION 'expected public.tags.created_at to exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shared_categories' AND column_name = 'created_at'
  ) THEN
    RAISE EXCEPTION 'expected public.shared_categories.created_at to exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'expected public.profiles.id to exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'updated_at'
      AND table_name IN ('everything', 'categories', 'profiles', 'tags', 'shared_categories')
  ) THEN
    RAISE EXCEPTION 'updated_at already exists on one of the target tables';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    RAISE EXCEPTION 'public.profiles.created_at already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Shared trigger function
-- ============================================================================
-- plpgsql + security invoker + empty search_path matches the project
-- template in .claude/rules/supabase-sql-patterns.md. The body is the
-- minimal shape: stamp NEW.updated_at = now() and return NEW.

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.touch_updated_at() IS
'Shared BEFORE UPDATE trigger: advances updated_at to now() on every row update.';

-- ============================================================================
-- PART 3: Add columns
-- ============================================================================
-- updated_at is added as NOT NULL DEFAULT now() on every target table.
-- Postgres 11+ stores the ALTER-time default as table metadata (no row
-- rewrite), then PART 4 overwrites each row with its real creation
-- timestamp so historical rows do not collapse to the apply moment.
--
-- profiles.created_at is added NULLABLE first because it is join-populated
-- from auth.users. It is tightened to NOT NULL DEFAULT now() at the tail
-- of PART 4 once every row has a value.

ALTER TABLE public.everything
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.categories
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.tags
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.shared_categories
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  ADD COLUMN created_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- ============================================================================
-- PART 4: Backfill historical rows
-- ============================================================================
-- Key decision: updated_at is backfilled from each table's existing
-- creation column, NOT from now(). Using now() would collapse every row's
-- "last changed" to the migration's apply time, which defeats the reason
-- we are adding the column in the first place.
--
-- For categories / tags / shared_categories the creation column is
-- nullable (default now()), so a small number of historical rows may be
-- NULL. Those fall back to now() — the row was created without the
-- default and we have no better signal than apply time.
--
-- profiles.created_at is joined from auth.users (same UUID as profiles.id).
-- Orphan profiles (no matching auth row) fall back to now(). The orphan
-- count is emitted via RAISE NOTICE before the fallback so it stays
-- recoverable from the apply log.

DO $$
DECLARE
  v_orphan_count integer;
BEGIN
  SELECT count(*) INTO v_orphan_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE u.id IS NULL;

  IF v_orphan_count > 0 THEN
    RAISE NOTICE 'profiles orphan backfill: % row(s) have no matching auth.users entry; created_at falls back to now()', v_orphan_count;
  ELSE
    RAISE NOTICE 'profiles orphan backfill: 0 orphan rows';
  END IF;
END $$;

UPDATE public.profiles p
   SET created_at = u.created_at
  FROM auth.users u
 WHERE u.id = p.id;

UPDATE public.profiles
   SET created_at = now()
 WHERE created_at IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.everything
   SET updated_at = inserted_at;

UPDATE public.categories
   SET updated_at = COALESCE(created_at, now());

UPDATE public.tags
   SET updated_at = COALESCE(created_at, now());

UPDATE public.shared_categories
   SET updated_at = COALESCE(created_at, now());

UPDATE public.profiles
   SET updated_at = created_at;

-- ============================================================================
-- PART 5: Attach triggers
-- ============================================================================
-- One BEFORE UPDATE FOR EACH ROW trigger per target table. The naming
-- convention <table>_touch_updated_at lets the done-check discover them
-- via a single pg_trigger pattern query.

CREATE TRIGGER everything_touch_updated_at
BEFORE UPDATE ON public.everything
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER categories_touch_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER profiles_touch_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER tags_touch_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER shared_categories_touch_updated_at
BEFORE UPDATE ON public.shared_categories
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================================
-- PART 6: Post-assertions
-- ============================================================================
-- Any failure here rolls back the entire transaction. Asserts:
--   1. Zero NULL updated_at on every target table
--   2. Zero NULL profiles.created_at
--   3. The shared trigger function exists
--   4. Exactly five <table>_touch_updated_at triggers exist

DO $$
DECLARE
  v_null_ct bigint;
  v_trigger_ct bigint;
BEGIN
  SELECT count(*) INTO v_null_ct FROM public.everything WHERE updated_at IS NULL;
  IF v_null_ct > 0 THEN RAISE EXCEPTION 'public.everything has % NULL updated_at', v_null_ct; END IF;

  SELECT count(*) INTO v_null_ct FROM public.categories WHERE updated_at IS NULL;
  IF v_null_ct > 0 THEN RAISE EXCEPTION 'public.categories has % NULL updated_at', v_null_ct; END IF;

  SELECT count(*) INTO v_null_ct FROM public.tags WHERE updated_at IS NULL;
  IF v_null_ct > 0 THEN RAISE EXCEPTION 'public.tags has % NULL updated_at', v_null_ct; END IF;

  SELECT count(*) INTO v_null_ct FROM public.shared_categories WHERE updated_at IS NULL;
  IF v_null_ct > 0 THEN RAISE EXCEPTION 'public.shared_categories has % NULL updated_at', v_null_ct; END IF;

  SELECT count(*) INTO v_null_ct FROM public.profiles WHERE updated_at IS NULL;
  IF v_null_ct > 0 THEN RAISE EXCEPTION 'public.profiles has % NULL updated_at', v_null_ct; END IF;

  SELECT count(*) INTO v_null_ct FROM public.profiles WHERE created_at IS NULL;
  IF v_null_ct > 0 THEN RAISE EXCEPTION 'public.profiles has % NULL created_at', v_null_ct; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'touch_updated_at' AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'public.touch_updated_at() missing';
  END IF;

  SELECT count(*) INTO v_trigger_ct
  FROM pg_trigger
  WHERE tgname IN (
    'everything_touch_updated_at',
    'categories_touch_updated_at',
    'profiles_touch_updated_at',
    'tags_touch_updated_at',
    'shared_categories_touch_updated_at'
  ) AND NOT tgisinternal;
  IF v_trigger_ct <> 5 THEN
    RAISE EXCEPTION 'expected 5 touch_updated_at triggers, found %', v_trigger_ct;
  END IF;
END $$;

COMMIT;
