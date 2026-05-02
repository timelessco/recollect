-- ============================================================================
-- Migration: Create subscriptions table for Polar billing state
-- Created: 2026-04-21
-- Purpose: Dedicated subscriptions table with owner-read RLS and no client
--          write policies (service-role writes only). Additive only --
--          existing billing columns and protect_billing_columns trigger on
--          public.profiles from 20260318081403 are left untouched and can
--          be retired in a follow-up once callers have migrated.
-- Affected: public.subscriptions (create)
-- ============================================================================

begin;

-- -----------------------------------------------------------------------
-- PART 1: Create subscriptions table
-- -----------------------------------------------------------------------

create table public.subscriptions (
  user_id                         uuid primary key
                                    references public.profiles(id) on delete cascade,
  plan                            text not null default 'free'
                                    constraint subscriptions_plan_check
                                    check (plan in ('free', 'pro', 'plus')),
  subscription_status             text,
  subscription_current_period_end timestamptz,
  polar_customer_id               text unique,
  polar_subscription_id           text unique,
  plan_updated_at                 timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

comment on table public.subscriptions is
  'Polar-backed subscription state. Service-role writes only; owners read own row. Row is inserted on first subscribe, updated on subsequent webhook events.';
comment on column public.subscriptions.plan is
  'Subscription plan: free, pro, or plus. Written by Polar webhook.';
comment on column public.subscriptions.subscription_status is
  'Polar SubscriptionStatus: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid.';
comment on column public.subscriptions.subscription_current_period_end is
  'End of current billing period. Used for canceled-state grace window.';
comment on column public.subscriptions.polar_customer_id is
  'Polar customer ID. Primary join key for webhook event processing.';
comment on column public.subscriptions.polar_subscription_id is
  'Polar subscription ID. Required for programmatic cancel/modify via Polar API.';
comment on column public.subscriptions.plan_updated_at is
  'Polar subscription.modifiedAt from webhook payload. Temporal guard: reject events with older modifiedAt.';

-- -----------------------------------------------------------------------
-- PART 2: Row Level Security
-- -----------------------------------------------------------------------

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions
  for select
  to authenticated
  using ( user_id = (select auth.uid()) );

-- Intentionally NO insert/update/delete policies:
-- authenticated clients cannot mutate subscription state via PostgREST.
-- service_role bypasses RLS, so webhook/admin code writes normally.

-- -----------------------------------------------------------------------
-- PART 3: Verification
-- -----------------------------------------------------------------------

do $$
declare
  write_policies int;
begin
  select count(*) into write_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'subscriptions'
    and cmd in ('INSERT', 'UPDATE', 'DELETE');
  if write_policies > 0 then
    raise exception 'subscriptions must have no insert/update/delete policies (found %)', write_policies;
  end if;
end;
$$;

commit;
