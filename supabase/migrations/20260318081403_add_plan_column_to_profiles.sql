-- ============================================================================
-- Migration: Add Polar billing columns to profiles
-- Created: 2026-03-18
-- Purpose: Store subscription state for Polar billing integration
-- Affected: public.profiles (add columns, add trigger)
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
'Polar subscription status: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid.';

COMMENT ON COLUMN public.profiles.subscription_current_period_end IS
'End of current billing period. Used for canceled grace period check.';

-- -----------------------------------------------------------------------
-- PART 3: Polar customer and subscription linkage
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN polar_customer_id TEXT,
ADD COLUMN polar_subscription_id TEXT;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_polar_customer_id_unique UNIQUE (polar_customer_id);

COMMENT ON COLUMN public.profiles.polar_customer_id IS
'Polar customer ID. Primary join key for webhook event processing.';

COMMENT ON COLUMN public.profiles.polar_subscription_id IS
'Polar subscription ID. Required for programmatic cancel/modify via API.';

-- -----------------------------------------------------------------------
-- PART 4: Webhook idempotency guard
-- -----------------------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN plan_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.plan_updated_at IS
'Polar subscription.modifiedAt from webhook payload. Temporal guard: reject events with older modifiedAt.';

-- -----------------------------------------------------------------------
-- PART 5: Protect billing columns from client-side writes
-- Existing RLS policy allows any authenticated user to UPDATE any column.
-- This trigger silently reverts billing column changes for non-service-role
-- callers, preventing users from self-assigning a plan via PostgREST.
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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_billing_columns_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_billing_columns();

COMMIT;
