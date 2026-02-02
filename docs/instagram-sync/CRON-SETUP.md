# pg_cron Setup for Instagram Sync

Automated queue processing using pg_cron to invoke the Edge Function every 10 seconds.

## Why pg_cron Is Not in Migrations

| Reason                                      | Impact                                                             |
| ------------------------------------------- | ------------------------------------------------------------------ |
| Edge Function URL unknown at migration time | Must deploy function first                                         |
| Environment-specific URLs                   | Local: `api.supabase.internal:8000`, Prod: `[PROJECT].supabase.co` |
| Vault secrets must exist first              | Job references secrets that need manual setup                      |
| Supabase pattern                            | Extensions/tables in migrations; jobs in post-deployment           |

## Local Development

**pg_cron is automatically configured** when you run `pnpm db:reset`.

The setup in `supabase/seed.sql` creates:

- Vault secret for Edge Function URL (Docker internal network)
- Vault secret for service role key (synced from edge runtime)
- pg_cron job running every 10 seconds using `invoke_instagram_worker()` wrapper

### Starting Local Environment

```bash
pnpm db:start # Start Supabase + sync vault secret
# OR
pnpm db:reset # Full reset + sync vault secret
```

> **Why vault sync?** Supabase CLI v2.x regenerates service role keys on each `supabase start`. The sync script copies the current key from the edge runtime into the vault so the cron job can authenticate.

### Verify Setup

After starting:

```sql
-- Check cron job exists
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname = 'process-instagram-imports';

-- Check vault secrets
SELECT name FROM vault.secrets
WHERE name IN ('instagram_worker_url', 'supabase_service_role_key');
```

### Monitor Execution

```sql
SELECT status, return_message, start_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-instagram-imports')
ORDER BY start_time DESC LIMIT 5;
```

### Monitor HTTP Failures

```sql
-- Check for failed HTTP requests to the worker
SELECT * FROM get_instagram_worker_failures(5);
```

### Manual Vault Sync

If you restarted Supabase without using `pnpm db:start`:

```bash
./scripts/sync-vault-secret.sh
```

## Wrapper Function

The cron job uses `invoke_instagram_worker()` instead of inline SQL. This wrapper:

1. Validates vault secrets exist before making HTTP call
2. Returns the `net.http_post` request ID for tracking
3. Provides clearer error messages when configuration is missing

```sql
-- Cron job command
SELECT invoke_instagram_worker();

-- Upgrade existing cron job to use wrapper
SELECT cron.unschedule('process-instagram-imports');
SELECT cron.schedule('process-instagram-imports', '10 seconds', 'SELECT invoke_instagram_worker();');
```

## Production Setup (One-Time)

Migrations are applied automatically when merging to dev/main branches.

> **Prerequisites**: Get your service role key from **Project Settings → API Keys → Legacy tab**

### Step 1: Deploy Edge Function

#### Dev Supabase Branch

```bash
npx supabase functions deploy process-instagram-imports --project-ref cjsdfdveobrpffjbkpca
```

#### Verify Deployment

Test the deployed function using REST Client:

1. Update `api-tests/.env` with target environment values:
   - `SERVICE_ROLE_KEY` - service role key (see Prerequisites)
   - `FUNCTIONS_BASE_URL` - edge function base URL

2. Run requests in `api-tests/edge-function-worker.http`:
   - `Health Check` → Returns `{ status: "ok", queue: "instagram_imports" }`
   - `Process Queue` → Processes pending imports

### Step 2: Run Setup Script

Use `docs/instagram-sync/setup-production-cron.sql`:

1. Replace `[SERVICE_ROLE_KEY]` with your service role key (see Prerequisites)
2. Replace `[PROJECT_REF]` with your Supabase project reference
3. Run via Supabase Dashboard SQL Editor

### Step 3: Verify

```sql
SELECT * FROM cron.job WHERE jobname = 'process-instagram-imports';
```

## Rollback / Feature Removal

```sql
-- Option 1: Temporarily disable (can re-enable later)
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-instagram-imports'),
  active := false
);

-- Option 2: Re-enable a disabled job
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-instagram-imports'),
  active := true
);

-- Option 3: Full removal
SELECT cron.unschedule('process-instagram-imports');
DELETE FROM vault.secrets WHERE name = 'instagram_worker_url';
```

## Troubleshooting

### Job not executing

Check if pg_cron extension is enabled:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

### Edge Function not reachable (Local)

From local Postgres container, the Edge Function URL must be:

- `http://api.supabase.internal:8000/functions/v1/...` (Docker network)
- NOT `http://localhost:54321` (won't resolve inside container)

### Vault secrets missing

```sql
SELECT name FROM vault.secrets
WHERE name IN ('instagram_worker_url', 'supabase_service_role_key');
```

### View job run history

```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 20;
```

### Vault secret mismatch (401 errors)

If the worker returns 401 Unauthorized, the vault secret is stale:

```bash
# Check for HTTP failures
psql "$LOCAL_DB" -c "SELECT * FROM get_instagram_worker_failures(5);"

# Re-sync the vault secret
./scripts/sync-vault-secret.sh
```

### Edge function logs

```bash
docker logs supabase_edge_runtime_recollect --since 1m
```

Look for `[instagram-worker]` prefixed messages.
