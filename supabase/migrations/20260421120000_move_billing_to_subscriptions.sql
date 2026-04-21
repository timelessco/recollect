-- ============================================================================
-- Migration: Move Polar billing from profiles into a dedicated subscriptions table
-- Created: 2026-04-21
-- Purpose: Isolate Polar-backed subscription state into a service-role-only
--          table with owner-read RLS. Replaces the protect_billing_columns
--          trigger added in 20260318081403 with the no-write-policy pattern
--          (Vercel-style separation), and relocates the six billing columns
--          off public.profiles.
-- Affected: public.subscriptions (create), public.profiles (drop 6 cols +
--           drop trigger + drop function)
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
  'Polar-backed subscription state. Service-role writes only; owners read own row.';
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
-- PART 3: updated_at touch trigger
-- -----------------------------------------------------------------------

create or replace function public.subscriptions_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row
  execute function public.subscriptions_touch_updated_at();

-- -----------------------------------------------------------------------
-- PART 4: Auto-create subscription row for each new profile
-- -----------------------------------------------------------------------

create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_subscription() from public;

create trigger profiles_create_subscription
  after insert on public.profiles
  for each row
  execute function public.handle_new_subscription();

-- -----------------------------------------------------------------------
-- PART 5: Backfill existing profiles
-- Copy non-default values from profiles so dev DBs that manually set plan
-- or polar ids retain them.
-- -----------------------------------------------------------------------

insert into public.subscriptions (
  user_id,
  plan,
  subscription_status,
  subscription_current_period_end,
  polar_customer_id,
  polar_subscription_id,
  plan_updated_at
)
select
  p.id,
  coalesce(p.plan, 'free'),
  p.subscription_status,
  p.subscription_current_period_end,
  p.polar_customer_id,
  p.polar_subscription_id,
  p.plan_updated_at
from public.profiles p
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------
-- PART 6: Drop legacy trigger + function on profiles
-- -----------------------------------------------------------------------

drop trigger if exists protect_billing_columns_trigger on public.profiles;
drop function if exists public.protect_billing_columns();

-- -----------------------------------------------------------------------
-- PART 7: Drop billing columns from profiles
-- -----------------------------------------------------------------------

alter table public.profiles
  drop constraint if exists profiles_polar_customer_id_unique,
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  drop column if exists plan,
  drop column if exists subscription_status,
  drop column if exists subscription_current_period_end,
  drop column if exists polar_customer_id,
  drop column if exists polar_subscription_id,
  drop column if exists plan_updated_at;

-- -----------------------------------------------------------------------
-- PART 8: Verification
-- -----------------------------------------------------------------------

do $$
declare
  missing_rows int;
  write_policies int;
  leftover_cols int;
begin
  select count(*) into missing_rows
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id
  where s.user_id is null;
  if missing_rows > 0 then
    raise exception 'Backfill incomplete: % profile(s) missing subscriptions row', missing_rows;
  end if;

  select count(*) into write_policies
  from pg_policy
  where polrelid = 'public.subscriptions'::regclass
    and polcmd in ('a', 'w', 'd');
  if write_policies > 0 then
    raise exception 'subscriptions must have no insert/update/delete policies (found %)', write_policies;
  end if;

  select count(*) into leftover_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles'
    and column_name in (
      'plan','subscription_status','subscription_current_period_end',
      'polar_customer_id','polar_subscription_id','plan_updated_at'
    );
  if leftover_cols > 0 then
    raise exception 'profiles still has % billing column(s)', leftover_cols;
  end if;
end;
$$;

commit;
