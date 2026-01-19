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

**pg_cron is automatically configured** when you run `npx supabase db reset`.

The setup in `supabase/seed.sql` creates:

- Vault secret for Edge Function URL (Docker internal network)
- Vault secret for service role key (static for local)
- pg_cron job running every 10 seconds

### Verify Setup

After `db reset`:

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

## Production Setup (One-Time)

### Step 1: Deploy Edge Function

```bash
supabase functions deploy process-instagram-imports
```

### Step 2: Run Setup Script

Use `docs/instagram-sync/setup-production-cron.sql`:

1. Edit the file and replace `[PROJECT_REF]` with your Supabase project reference
2. Run via Supabase Dashboard SQL Editor

Or run directly:

```sql
-- Replace [PROJECT_REF] with actual project reference
SELECT vault.create_secret(
  'https://[PROJECT_REF].supabase.co/functions/v1/process-instagram-imports',
  'instagram_worker_url'
);

SELECT cron.schedule(
  'process-instagram-imports',
  '10 seconds',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'instagram_worker_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
```

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
