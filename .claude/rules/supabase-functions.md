---
paths: supabase/**/*.sql
---

# Supabase Database Functions

Generate high-quality PostgreSQL functions following these best practices.

## General Guidelines

1. **Default to `SECURITY INVOKER`:**
   - Functions run with permissions of the invoking user
   - Use `SECURITY DEFINER` only when explicitly required

2. **Set `search_path` to empty:**
   - Always: `set search_path = ''`
   - Use fully qualified names: `schema_name.table_name`

3. **Use Explicit Typing:**
   - Clearly specify input and output types
   - Avoid ambiguous or loosely typed parameters

4. **Default to Immutable or Stable:**
   - Use `IMMUTABLE` or `STABLE` when possible
   - Use `VOLATILE` only if modifying data

## Example Templates

### Simple Function

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

### Function with Parameters

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

### Trigger Function

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

### Immutable Function

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
