-- ============================================================================
-- MIGRATION: Add Upload File Queue Setup
-- Created: 2025-12-01
-- Version: 1.0
-- Description: Sets up pgmq queue for processing file upload enrichment jobs
--              (blurhash generation, OCR, AI image captions, etc.)
-- ============================================================================

-- ============================================================================
-- 1. QUEUE CREATION
-- ============================================================================
-- Creates the upload-file-queue if it doesn't already exist
-- This queue processes file upload enrichment jobs (blurhash, OCR, AI captions, etc.)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = 'upload-file-queue') THEN
    PERFORM pgmq.create('upload-file-queue');
  END IF;
END $$;

-- ============================================================================
-- 2. QUEUE PERMISSIONS AND POLICIES
-- ============================================================================
-- Sets up RLS and grants for the queue
-- Only runs if the queue table was successfully created
-- ----------------------------------------------------------------------------
-- NOTE: Database webhooks should be created via Supabase UI/Dashboard
--       as they are environment-specific (localhost vs production URLs)
-- 
-- To create the webhook via Supabase Dashboard:
--   1. Go to Database > Webhooks
--   2. Click "Create a new hook"
--   3. Name: upload-file-queue-webhook
--   4. Table: q_upload-file-queue (in pgmq schema)
--   5. Events: Insert
--   6. Type: HTTP Request
--   7. Method: POST
--   8. URL: http://localhost:3000/api/v1/file/upload/tasks/queue-consumer
--           (Update for production environment)
--   9. Timeout: 5000ms
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Only configure if the queue table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_upload-file-queue') THEN

    -- Clean up any manually created triggers/functions
    DROP TRIGGER IF EXISTS "upload-file-queue-webhook" ON "pgmq"."q_upload-file-queue";
    DROP FUNCTION IF EXISTS "pgmq"."notify_upload_file_queue"();

    -- Enable RLS on pgmq queue
    ALTER TABLE "pgmq"."q_upload-file-queue" ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy for queue access
    DROP POLICY IF EXISTS "auth-access" ON "pgmq"."q_upload-file-queue";
    CREATE POLICY "auth-access" ON "pgmq"."q_upload-file-queue"
      AS permissive FOR all TO authenticated USING (true);

    -- Grant permissions for queue tables
    GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "pgmq"."q_upload-file-queue" TO "authenticated";
    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."q_upload-file-queue" TO "service_role";

    -- Grant permissions for archive table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_upload-file-queue') THEN
      GRANT INSERT, SELECT ON TABLE "pgmq"."a_upload-file-queue" TO "authenticated";
      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."a_upload-file-queue" TO "service_role";
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. CRON JOB SETUP
-- ============================================================================
-- Configure scheduled job for archive cleanup using pg_cron extension
-- ----------------------------------------------------------------------------
-- Purpose: Delete archived messages from the upload-file-queue daily at 1:30 AM
-- Schedule: Every day at 1:30 AM (30 1 * * *)
-- Note: Different time than bookmark queue (1:00 AM) to avoid conflicts
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Only create cron job if the archive table exists and pg_cron is available
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'a_upload-file-queue')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    
    -- Remove existing job if it exists (pg_cron doesn't have IF NOT EXISTS)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'upload-file-queue-cron') THEN
      PERFORM cron.unschedule('upload-file-queue-cron');
    END IF;
    
    -- Schedule the job to run daily at 1:30 AM
    PERFORM cron.schedule(
      'upload-file-queue-cron',  -- job name
      '30 1 * * *',                -- cron schedule: daily at 1:30 AM
      $cmd$DELETE FROM pgmq."a_upload-file-queue"$cmd$  -- SQL to execute
    );
  END IF;
END $$;


