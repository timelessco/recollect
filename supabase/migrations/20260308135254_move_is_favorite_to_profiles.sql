-- ============================================================================
-- Migration: Move is_favorite from categories to profiles
-- Created: 2026-03-08
-- Purpose: Make favorite categories user-specific by storing them as an array
--          on the profiles table instead of a boolean on categories
-- Affected: public.profiles (add column), public.categories (drop column)
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- PART 1: Add favorite_categories array column to profiles
-- -----------------------------------------------------------------------

alter table public.profiles
add column favorite_categories integer[] not null default '{}';

comment on column public.profiles.favorite_categories is
'Array of category IDs favorited by this user. Supports independent favorites for shared categories.';

-- -----------------------------------------------------------------------
-- PART 2: Migrate existing data from categories.is_favorite
-- -----------------------------------------------------------------------

update public.profiles p
set favorite_categories = array(
  select c.id from public.categories c
  where c.user_id = p.id and c.is_favorite = true
);

-- -----------------------------------------------------------------------
-- PART 3: Create toggle RPC function
-- -----------------------------------------------------------------------

create or replace function public.toggle_favorite_category(p_category_id integer)
returns table(out_id uuid, out_favorite_categories integer[])
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row record;
begin
  update public.profiles p
  set favorite_categories = case
    when p_category_id = any(coalesce(p.favorite_categories, '{}'))
    then array_remove(coalesce(p.favorite_categories, '{}'), p_category_id)
    else array_append(coalesce(p.favorite_categories, '{}'), p_category_id)
  end
  where p.id = auth.uid()
  returning p.id, p.favorite_categories into v_row;

  return query select v_row.id, v_row.favorite_categories;
end;
$$;

revoke execute on function public.toggle_favorite_category(integer) from public;
revoke execute on function public.toggle_favorite_category(integer) from anon;
grant execute on function public.toggle_favorite_category(integer) to authenticated;

comment on function public.toggle_favorite_category is
'Toggles a favorite category: adds if absent, removes if present. Returns id and favorite_categories.';

-- -----------------------------------------------------------------------
-- PART 4: Create cleanup function for category deletion
-- -----------------------------------------------------------------------

-- SECURITY DEFINER so it can update all profiles, not just the caller's
create or replace function public.remove_category_from_all_favorites(p_category_id integer)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.profiles
  set favorite_categories = array_remove(favorite_categories, p_category_id)
  where p_category_id = any(favorite_categories);
$$;

revoke execute on function public.remove_category_from_all_favorites(integer) from public;
revoke execute on function public.remove_category_from_all_favorites(integer) from anon;
revoke execute on function public.remove_category_from_all_favorites(integer) from authenticated;

comment on function public.remove_category_from_all_favorites is
'Removes a category ID from all users favorite_categories arrays. Used during category deletion cleanup.';

-- -----------------------------------------------------------------------
-- PART 5: Drop old column from categories
-- -----------------------------------------------------------------------

alter table public.categories drop column is_favorite;

COMMIT;
