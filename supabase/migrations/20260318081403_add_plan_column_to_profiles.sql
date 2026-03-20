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

alter table public.profiles
add column plan text not null default 'free'
constraint profiles_plan_check check (plan in ('free', 'pro', 'plus'));

comment on column public.profiles.plan is
'Subscription plan: free, pro, or plus. Updated by Polar webhook.';

-- -----------------------------------------------------------------------
-- PART 2: Subscription lifecycle columns
-- -----------------------------------------------------------------------

alter table public.profiles
add column subscription_status text,
add column subscription_current_period_end timestamptz;

comment on column public.profiles.subscription_status is
'Polar subscription status: active, canceled, revoked, past_due.';

comment on column public.profiles.subscription_current_period_end is
'End of current billing period. Used for canceled grace period check.';

-- -----------------------------------------------------------------------
-- PART 3: Polar customer linkage
-- -----------------------------------------------------------------------

alter table public.profiles
add column polar_customer_id text;

alter table public.profiles
add constraint profiles_polar_customer_id_unique unique (polar_customer_id);

comment on column public.profiles.polar_customer_id is
'Polar customer ID. Primary join key for webhook event processing.';

-- -----------------------------------------------------------------------
-- PART 4: Webhook idempotency guard
-- -----------------------------------------------------------------------

alter table public.profiles
add column plan_updated_at timestamptz;

comment on column public.profiles.plan_updated_at is
'Timestamp of last webhook update. Temporal guard against out-of-order events.';

COMMIT;
