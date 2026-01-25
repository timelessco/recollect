# Supabase CLI Local Development

## CRITICAL: Local Only

**NEVER** run these commands - they affect production:

- `supabase link`
- `supabase db push`
- `supabase db pull`
- Any command with `--linked` flag

All CLI commands in this project affect LOCAL Supabase only.

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

| Command                     | Effect                                       | Use When                                |
| --------------------------- | -------------------------------------------- | --------------------------------------- |
| `npx supabase migration up` | Apply pending migrations, **preserves data** | Testing new migrations (default)        |
| `npx supabase db reset`     | Full reset, **loses all data**               | Clean slate, conflicts, or seed testing |

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
