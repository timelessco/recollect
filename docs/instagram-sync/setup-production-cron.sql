-- =============================================================================
-- PRODUCTION - pg_cron Job Setup
-- Run AFTER deploying Edge Function
-- =============================================================================
--
-- BEFORE RUNNING:
-- 1. Replace [PROJECT_REF] with your actual Supabase project reference
-- 2. Ensure the Edge Function is deployed: npx supabase functions deploy process-instagram-imports
-- 3. Ensure supabase_service_role_key exists in vault (set via Supabase Dashboard)
--
-- =============================================================================

-- 1. Store Edge Function URL
-- Replace [PROJECT_REF] with your actual project reference (e.g., 'abcdefghijklmnop')
SELECT vault.create_secret(
  'https://[PROJECT_REF].supabase.co/functions/v1/process-instagram-imports',
  'instagram_worker_url'
);

-- 2. Create pg_cron job (10 second interval)
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

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 'Vault secrets:' as info;
SELECT name FROM vault.secrets WHERE name IN ('instagram_worker_url', 'supabase_service_role_key');

SELECT 'Cron job:' as info;
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'process-instagram-imports';

-- =============================================================================
-- ROLLBACK / FEATURE REMOVAL
-- =============================================================================

-- Option 1: Temporarily disable (keeps config, can re-enable later)
-- SELECT cron.alter_job(
--   (SELECT jobid FROM cron.job WHERE jobname = 'process-instagram-imports'),
--   active := false
-- );

-- Option 2: Re-enable a disabled job
-- SELECT cron.alter_job(
--   (SELECT jobid FROM cron.job WHERE jobname = 'process-instagram-imports'),
--   active := true
-- );

-- Option 3: Full removal (delete job + secrets)
-- SELECT cron.unschedule('process-instagram-imports');
-- DELETE FROM vault.secrets WHERE name = 'instagram_worker_url';

-- =============================================================================
