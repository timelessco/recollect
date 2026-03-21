-- ============================================================================
-- Migration: Add Polar billing columns to profiles
-- Created: 2026-03-18
-- Purpose: Store subscription state for Polar billing integration
-- Affected: public.profiles (add columns)
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- PART 1: Plan column with CHECK constraint
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'plus'));

COMMENT ON COLUMN public.profiles.plan IS
'Subscription plan: free, pro, or plus. Updated by Polar webhook.';

-- -----------------------------------------------------------------------
-- PART 2: Subscription lifecycle columns
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN subscription_status TEXT,
ADD COLUMN subscription_current_period_end TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.subscription_status IS
'Polar subscription status: active, canceled, revoked, past_due.';

COMMENT ON COLUMN public.profiles.subscription_current_period_end IS
'End of current billing period. Used for canceled grace period check.';

-- -----------------------------------------------------------------------
-- PART 3: Polar customer linkage
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN polar_customer_id TEXT;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_polar_customer_id_unique UNIQUE (polar_customer_id);

COMMENT ON COLUMN public.profiles.polar_customer_id IS
'Polar customer ID. Primary join key for webhook event processing.';

-- -----------------------------------------------------------------------
-- PART 4: Webhook idempotency guard
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN plan_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.plan_updated_at IS
'Timestamp of last webhook update. Temporal guard against out-of-order events.';

COMMIT;
