-- ============================================================================
-- Migration: Add historical-sync tracking columns to profiles
-- Created: 2026-04-16
-- Purpose: Track per-platform completion of full historical bookmark sync
--          (Instagram, X, Chrome) and the boundary timestamp Chrome free
--          users use to distinguish historical-skipped bookmarks from new
--          ones added after the first capped import.
-- Affected: public.profiles (add columns, extend protect_billing_columns)
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- PART 1: Per-platform historical-sync completion booleans
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN instagram_historical_synced BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN twitter_historical_synced BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN chrome_historical_synced BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.instagram_historical_synced IS
  'TRUE once a paid user has completed a full historical Instagram sync (content script paginated to hasMore=false). Hides the historical-sync toggle in the extension.';

COMMENT ON COLUMN public.profiles.twitter_historical_synced IS
  'TRUE once a paid user has completed a full historical X (Twitter) sync. Hides the historical-sync toggle in the extension.';

COMMENT ON COLUMN public.profiles.chrome_historical_synced IS
  'TRUE once a paid user has completed a full historical Chrome bookmarks import. Hides the historical-sync toggle in the extension.';

-- -----------------------------------------------------------------------
-- PART 2: Chrome first-import boundary timestamp
-- Chrome bookmarks have no pagination cursor, so the extension re-uploads
-- the full flattened tree each time. For free users this column marks the
-- boundary: bookmarks with dateAdded > chrome_first_import_at are "new"
-- (uncapped diff); older ones are historical (capped at 10 total).
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN chrome_first_import_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.chrome_first_import_at IS
  'Set on a free user''s first Chrome bookmarks import. Free-tier subsequent imports filter to bookmarks with inserted_at > this value (no count cap on diffs). NULL until first import.';

-- -----------------------------------------------------------------------
-- PART 3: Extend protect_billing_columns trigger to cover new fields
-- The new columns must be writable only by the service role (sync API
-- routes). Without this, an authenticated client could self-flip the
-- booleans via PostgREST and bypass the historical-sync toggle.
-- -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') != 'service_role' THEN
    NEW.plan := OLD.plan;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_current_period_end := OLD.subscription_current_period_end;
    NEW.polar_customer_id := OLD.polar_customer_id;
    NEW.polar_subscription_id := OLD.polar_subscription_id;
    NEW.plan_updated_at := OLD.plan_updated_at;
    NEW.instagram_historical_synced := OLD.instagram_historical_synced;
    NEW.twitter_historical_synced := OLD.twitter_historical_synced;
    NEW.chrome_historical_synced := OLD.chrome_historical_synced;
    NEW.chrome_first_import_at := OLD.chrome_first_import_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
