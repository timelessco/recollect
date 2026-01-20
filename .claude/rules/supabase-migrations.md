---
paths: supabase/migrations/**
---

# Supabase Migrations

## File Naming Convention

Migration files MUST follow: `YYYYMMDDHHmmss_short_description.sql`

- `YYYY` - Four digits for year (e.g., `2024`)
- `MM` - Two digits for month (01-12)
- `DD` - Two digits for day (01-31)
- `HH` - Two digits for hour in 24h format (00-23)
- `mm` - Two digits for minute (00-59)
- `ss` - Two digits for second (00-59)

Example: `20240906123045_create_profiles.sql`

## SQL Guidelines

- Include header comment with migration purpose and affected tables
- Add comments explaining each migration step
- Write SQL in lowercase (or uppercase consistently within file)
- Add copious comments for destructive commands (truncate, drop, alter)

## Row Level Security

**MUST enable RLS on every new table**, even for public access:

```sql
alter table my_table enable row level security;
```

### RLS Policy Rules

- Create separate policies for each operation (select, insert, update, delete)
- Create separate policies for each role (`anon`, `authenticated`)
- DO NOT combine policies even if functionality is the same
- Include comments explaining policy rationale

```sql
-- Allow authenticated users to read their own records
create policy "Users can view own records"
on my_table for select
to authenticated
using (user_id = auth.uid());

-- Allow authenticated users to insert their own records
create policy "Users can insert own records"
on my_table for insert
to authenticated
with check (user_id = auth.uid());
```
