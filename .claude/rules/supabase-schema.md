---
paths: supabase/**
---

# Supabase Declarative Schema Management

## Core Rules

1. **Schema files in `supabase/schemas/`**
   - All schema modifications go in `.sql` files here
   - DO NOT modify `supabase/migrations/` directly (auto-generated)

2. **Migration Generation Workflow**

   ```bash
   # Stop local dev environment first
   supabase stop

   # Generate migration from schema diff
   supabase db diff -f <migration_name>
   ```

3. **File Organization**
   - Files execute in lexicographic order
   - Name files to manage dependencies (foreign keys)
   - Append new columns to end of table definitions

## Rollback Procedure

1. Update `.sql` files in `supabase/schemas/` to desired state
2. Generate rollback migration: `supabase db diff -f <rollback_name>`
3. Review migration carefully for data loss

## Known Caveats (Use Versioned Migrations Instead)

These are NOT tracked by schema diff:

- DML statements (insert, update, delete)
- View ownership and grants
- Security invoker on views
- Materialized views
- ALTER POLICY statements
- Column privileges
- Schema privileges
- Comments
- Partitions
- ALTER PUBLICATION statements
- CREATE DOMAIN statements

**Non-compliance may lead to inconsistent database states.**
