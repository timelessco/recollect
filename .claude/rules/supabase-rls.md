---
paths: supabase/**/*.sql
---

# Supabase RLS Policies

## Policy Structure

- SELECT policies: USING only (not WITH CHECK)
- INSERT policies: WITH CHECK only (not USING)
- UPDATE policies: Both USING and WITH CHECK
- DELETE policies: USING only (not WITH CHECK)

## Required Patterns

- Always use `auth.uid()` instead of `current_user`
- Don't use `FOR ALL` - create separate policies per operation
- Always specify role with `TO` clause (`anon`, `authenticated`)
- Use descriptive policy names in double quotes
- Prefer `PERMISSIVE` over `RESTRICTIVE` policies

## Correct Syntax Order

```sql
create policy "Policy name"
on table_name
for select           -- operation comes first
to authenticated     -- role comes after operation
using ( ... );
```

## Performance Recommendations

### Add Indexes

```sql
create index idx_table_user_id
on my_table
using btree (user_id);
```

### Use Select Wrapper for Functions

```sql
-- ❌ Slow - function called per row
using ( auth.uid() = user_id );

-- ✅ Fast - function cached per statement
using ( (select auth.uid()) = user_id );
```

### Minimize Joins

```sql
-- ✅ Use IN with subquery instead of joins
using (
  team_id in (
    select team_id
    from team_members
    where user_id = (select auth.uid())
  )
);
```

## Example Policies

```sql
-- Select policy for authenticated users
create policy "Users can view own records"
on my_table
for select
to authenticated
using ( (select auth.uid()) = user_id );

-- Insert policy with validation
create policy "Users can insert own records"
on my_table
for insert
to authenticated
with check ( (select auth.uid()) = user_id );

-- Update policy with both clauses
create policy "Users can update own records"
on my_table
for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- Delete policy
create policy "Users can delete own records"
on my_table
for delete
to authenticated
using ( (select auth.uid()) = user_id );
```
