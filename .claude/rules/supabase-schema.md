---
paths:
  - "supabase/**"
---

## Supabase Schema

### Core Rules

1. **Schema files in `supabase/schemas/`** — all modifications go here as `.sql` files. Do NOT modify `supabase/migrations/` directly (auto-generated)
2. **Migration generation workflow**:
   ```bash
   supabase stop                     # stop local dev first
   supabase db diff -f <migration_name>
   ```
3. **File organization** — files execute in lexicographic order. Name files to manage dependencies (foreign keys). Append new columns to end of table definitions

### Rollback Procedure

1. Update `.sql` files in `supabase/schemas/` to desired state
2. Generate rollback migration: `supabase db diff -f <rollback_name>`
3. Review migration carefully for data loss

### Known Caveats — NOT tracked by schema diff (use versioned migrations instead)

DML statements (insert/update/delete), view ownership and grants, security invoker on views, materialized views, `ALTER POLICY` statements, column privileges, schema privileges, comments, partitions, `ALTER PUBLICATION` statements, `CREATE DOMAIN` statements.

**Non-compliance may lead to inconsistent database states.**
