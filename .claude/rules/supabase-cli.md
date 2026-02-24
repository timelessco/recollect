# Supabase CLI Local Development

## CRITICAL: Local Only

**NEVER** run these commands - they affect production:

- `supabase link`
- `supabase db push`
- `supabase db pull`
- Any command with `--linked` flag

All CLI commands in this project affect LOCAL Supabase only.

**Severity**: Using `--linked` is a production-altering failure. Before running ANY supabase CLI command, confirm the command is local-only.

**To check link status** (read-only diagnostic):

```bash
cat .supabase/project-ref # If file exists, project is linked to cloud
```

If missing, the project is not linked. Never link it.

## Always Use npx

```bash
# ✅ Correct
npx supabase status
npx supabase migration up
npx supabase db reset

# ❌ Wrong - may use different version
supabase status
```

## Pre-flight Check

Before any database operation:

```bash
npx supabase status # Verify local is running
```

## Migration Commands

| Command                     | Effect                                             | Use When                                |
| --------------------------- | -------------------------------------------------- | --------------------------------------- |
| `npx supabase migration up` | Apply pending migrations, **preserves data**       | Testing new migrations (default)        |
| `pnpm db:reset`             | Full reset, **loses all data**, syncs vault secret | Clean slate, conflicts, or seed testing |

**Default to `migration up`** - only use `db reset` when explicitly needed.

## SQL Execution for Testing

Use Supabase MCP tool for SQL:

```
mcp__supabase-local__execute_sql
```

For pgmq queue verification, use direct table access:

```sql
-- Direct table query (recommended for verification)
SELECT * FROM pgmq."q_queue-name" WHERE condition;

-- pgmq.read() has visibility timeout - use for actual consumption
SELECT * FROM pgmq.read('queue-name', 30, 10);
```

## Type Generation

After migrations, regenerate types:

```bash
pnpm db:types # Generates from LOCAL schema
```

## Seed-Migration Conflicts

When `pnpm db:reset` fails due to seed/schema mismatch:

1. **Migrations are the source of truth** — fix `seed.sql` to match migrations, never modify migrations to match seed
2. Fix ALL column mismatches in the same pass — partial fixes create new failures
3. After fixing seed, verify with another `pnpm db:reset` before declaring resolved

**Service role key in seed.sql**: The key rotates on each `supabase start`. Fetch the current value:

```bash
docker exec supabase_edge_runtime_recollect printenv SUPABASE_SERVICE_ROLE_KEY | pbcopy
```

Never hardcode a static key value in `seed.sql`.
