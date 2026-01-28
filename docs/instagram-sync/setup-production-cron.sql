-- =============================================================================
-- PRODUCTION - pg_cron Job Setup
-- Run AFTER deploying Edge Function
-- =============================================================================
--
-- BEFORE RUNNING:
-- 1. Replace [PROJECT_REF] with your Supabase project reference
-- 2. Replace [SERVICE_ROLE_KEY] with your service role key (from Project Settings → API Keys → Legacy tab)
-- 3. Ensure Edge Function is deployed: npx supabase functions deploy process-instagram-imports
--
-- =============================================================================

-- 1. Store service role key in vault
SELECT vault.create_secret(
  '[SERVICE_ROLE_KEY]',
  'supabase_service_role_key'
);

-- 2. Store Edge Function URL
SELECT vault.create_secret(
  'https://[PROJECT_REF].supabase.co/functions/v1/process-instagram-imports',
  'instagram_worker_url'
);

-- 3. Create pg_cron job (uses wrapper function from migration)
SELECT cron.schedule(
  'process-instagram-imports',
  '10 seconds',
  'SELECT invoke_instagram_worker();'
);

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 'Vault secrets:' as info;
SELECT name FROM vault.secrets WHERE name IN ('instagram_worker_url', 'supabase_service_role_key');

SELECT 'Cron job:' as info;
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'process-instagram-imports';

-- =============================================================================
-- UPGRADING: Replace existing cron job with wrapper function
-- =============================================================================
-- If you have an existing cron job using inline SQL, replace it:
--
-- SELECT cron.unschedule('process-instagram-imports');
-- SELECT cron.schedule('process-instagram-imports', '10 seconds', 'SELECT invoke_instagram_worker();');

-- =============================================================================
-- MONITORING: Check for HTTP failures
-- =============================================================================
-- After migration, use the helper function:
-- SELECT * FROM get_instagram_worker_failures(5);
--
-- Or raw SQL:
-- SELECT id, status_code, content::text as error, created
-- FROM net._http_response
-- WHERE (status_code < 200 OR status_code >= 300)
-- AND created > NOW() - INTERVAL '5 minutes';

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
