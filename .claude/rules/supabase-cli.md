---
paths:
  - "supabase/**"
  - "seed.sql"
---

## Supabase CLI

### CRITICAL: Local Only

**NEVER** run — these affect production:

- `supabase link`
- `supabase db push`
- `supabase db pull`
- Any command with `--linked` flag

All CLI commands in this project affect LOCAL Supabase only. Using `--linked` is a production-altering failure.

Check link status (read-only): `cat .supabase/project-ref` — exists = linked.

### Always Use npx

```bash
npx supabase status       # ✓
npx supabase migration up # ✓
supabase status           # ✗ may use different version
```

Pre-flight: `npx supabase status` to verify local is running.

### Migration Commands

| Command | Effect | When |
|---|---|---|
| `npx supabase migration up` | Apply pending, **preserves data** | Default |
| `pnpm db:reset` | Full reset, **loses data**, syncs vault | Clean slate, conflicts, seeding |

### Migration Safety Rules

- NEVER add database indexes without explicit user approval — may conflict with production
- NEVER create a new migration file when the user wants changes merged into an existing one — check for existing PR migrations first
- NEVER modify an already-committed migration file — breaks remote/cloud sync. Only add new migrations with later timestamps
- NEVER put production-specific setup (vault secrets, pg_cron jobs) in migration files — use `docs/setup-production-*.sql`
- NEVER reference columns without verifying in `src/types/database-generated.types.ts`
- NEVER assume local migrations reflect prod — 3 environments (local / dev `cjsdfdveobrpffjbkpca` / prod `fgveraehgourpwwzlzhy`)
- When creating migrations, consider: local dev, seed data, AND production differences
- Vault secrets differ between environments — document which need manual setup
- pg_cron jobs NOT in migrations — require post-deployment setup; local cron in `seed.sql`
- Verify pgmq queue names by reading the migration that calls `pgmq.create()` and cross-checking constants
- `CREATE INDEX CONCURRENTLY` cannot run inside `BEGIN/COMMIT` — use a separate migration file
- SQL migration format: `BEGIN/COMMIT`, PART separators, numbered steps, pre-flight `DO $$` validation, `GRANT/REVOKE`, post-migration verification, `COMMENT ON`
- Seeding conflicts on fresh start: use Supabase's `sql_paths` in `config.toml` with a cleanup pre-seed file

### SQL Execution

Use Supabase MCP for SQL: `mcp__supabase-local__execute_sql`.

For pgmq verification, use direct table access:

```sql
SELECT * FROM pgmq."q_queue-name" WHERE condition;
```

### Database Gotchas

- `profiles.category_order` updates: batch concat (`|| v_new_category_ids`), NOT read-modify-write loops — Edge Function processes the queue in parallel (`Promise.allSettled`); SELECT-into-var + UPDATE causes lost writes (see `20260209` migration)
- Always `pnpm db:reset` before `pnpm db:types` — stale local DB drops RPC functions that exist in prod

### Type Generation

```bash
pnpm db:types # Generates from LOCAL schema
```

### Seed-Migration Conflicts

1. **Migrations are source of truth** — fix `seed.sql`, never modify migrations
2. Fix ALL column mismatches in one pass
3. Verify with `pnpm db:reset` before declaring resolved

### Service Role Key

Rotates on each `supabase start`. Fetch dynamically:

```bash
docker exec supabase_edge_runtime_recollect printenv SUPABASE_SERVICE_ROLE_KEY | pbcopy
```
