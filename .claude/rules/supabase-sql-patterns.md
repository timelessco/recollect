---
paths:
  - "supabase/**/*.sql"
---

## Supabase SQL Patterns (Functions + RLS)

### Functions — General Guidelines

1. **Default to `SECURITY INVOKER`** — use `SECURITY DEFINER` only when explicitly required
2. **Always `set search_path = ''`** — use fully qualified names: `schema_name.table_name`
3. **Explicit typing** — clearly specify input and output types
4. **Default to `IMMUTABLE` or `STABLE`** — use `VOLATILE` only if modifying data

### Function Templates

Simple function:
```sql
create or replace function my_schema.hello_world()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return 'hello world';
end;
$$;
```

Function with parameters:
```sql
create or replace function public.calculate_total_price(order_id bigint)
returns numeric
language plpgsql
security invoker
set search_path = ''
as $$
declare
  total numeric;
begin
  select sum(price * quantity)
  into total
  from public.order_items
  where order_id = calculate_total_price.order_id;

  return total;
end;
$$;
```

Trigger function:
```sql
create or replace function my_schema.update_updated_at()
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

create trigger update_updated_at_trigger
before update on my_schema.my_table
for each row
execute function my_schema.update_updated_at();
```

Immutable function:
```sql
create or replace function my_schema.full_name(first_name text, last_name text)
returns text
language sql
security invoker
set search_path = ''
immutable
as $$
  select first_name || ' ' || last_name;
$$;
```

### Function Error Handling

Use `RAISE EXCEPTION` for auth guards, input validation, and business rules. In queue-processing functions, use `RAISE WARNING` + bare `RAISE` for observability before triggering rollback:

```sql
-- Auth/input guard
if not found then
  raise exception 'Bookmark not found or not owned by user';
end if;

-- Queue processing: log then re-raise for pgmq retry
exception when others then
  raise warning 'process failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  raise;  -- re-raise to trigger rollback and pgmq retry
```

### RLS — Policy Structure

- **SELECT** policies: `USING` only (not `WITH CHECK`)
- **INSERT** policies: `WITH CHECK` only (not `USING`)
- **UPDATE** policies: both `USING` and `WITH CHECK`
- **DELETE** policies: `USING` only (not `WITH CHECK`)

### RLS — Required Patterns

- Always use `auth.uid()` instead of `current_user`
- `auth.jwt()->>'email'` for email-based sharing checks — always wrap in `(SELECT ...)`: `(select auth.jwt()->>'email') = email`
- Don't use `FOR ALL` — create separate policies per operation
- Always specify role with `TO` clause (`anon`, `authenticated`)
- Use descriptive policy names in double quotes
- Prefer `PERMISSIVE` over `RESTRICTIVE` policies

### RLS — Correct Syntax Order

```sql
create policy "Policy name"
on table_name
for select           -- operation first
to authenticated     -- role after operation
using ( ... );
```

### RLS — Performance

Add an index:
```sql
create index idx_table_user_id on my_table using btree (user_id);
```

Use a select wrapper for functions (caches per statement vs per row):
```sql
-- ❌ Slow — function called per row
using ( auth.uid() = user_id );

-- ✅ Fast — function cached per statement
using ( (select auth.uid()) = user_id );
```

Minimize joins — prefer `IN` with subquery:
```sql
using (
  team_id in (
    select team_id
    from team_members
    where user_id = (select auth.uid())
  )
);
```

### RLS — Example Policies

```sql
-- Select
create policy "Users can view own records"
on my_table
for select
to authenticated
using ( (select auth.uid()) = user_id );

-- Insert with validation
create policy "Users can insert own records"
on my_table
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- Update with both clauses
create policy "Users can update own records"
on my_table
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- Delete
create policy "Users can delete own records"
on my_table
for delete
to authenticated
using ( (select auth.uid()) = user_id );
```

### RLS — Hardening Checklist

When replacing permissive policies or adding RLS to existing tables, the per-op template is necessary but not sufficient:

- **Junction tables**: INSERT/UPDATE must verify BOTH FK sides via subquery, not just `user_id = auth.uid()`. FK + UNIQUE alone let a caller reserve another user's slot under their own `user_id`.
- **Column-scoped UPDATE**: RLS cannot restrict which columns mutate. Pair the policy with a `BEFORE UPDATE` trigger that blocks non-whitelisted column changes when `OLD.user_id IS DISTINCT FROM auth.uid()`.
- **Cross-FK owner UPDATE**: if the row FKs into another ownership-checked table, `WITH CHECK` must re-assert FK ownership (`AND fk_id IN (SELECT id FROM other_table WHERE user_id = auth.uid())`) or the owner can repoint to a row they don't own.
- **Drop legacy policies by exact name, including typos**: prod may have `"auth acceess"`. Use `DROP POLICY IF EXISTS` with the live name, not the corrected spelling.
- **End every RLS migration with a verification `DO $$`**: assert expected policy names exist and `count(*) FROM pg_policies WHERE (qual='true' OR with_check='true')` on target tables is zero. A typo otherwise leaves the hole open silently.

### RLS — cspell-safe comment vocabulary

Use `defense` (not `defence`), `preferences` (not `prefs`), `redirected`/`redirecting` (not `repointed`/`repointing`), `tag associations` (not `taggings`).
