-- ============================================================================
-- MIGRATION: Add Bookmark URL Queue Setup
-- Created: 2025-11-26
-- Version: 1.0
-- Description: Sets up pgmq queue for processing bookmark URL enrichment jobs
--              (screenshots, metadata extraction, etc.)
-- ============================================================================

-- ============================================================================
-- 1. QUEUE CREATION
-- ============================================================================
-- Creates the add-bookmark-url-queue if it doesn't already exist
-- This queue processes bookmark URL enrichment jobs (screenshots, metadata, etc.)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = 'add-bookmark-url-queue') THEN
    PERFORM pgmq.create('add-bookmark-url-queue');
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
--   3. Name: add-bookmark-url-queue-webhook
--   4. Table: q_add-bookmark-url-queue (in pgmq schema)
--   5. Events: Insert
--   6. Type: HTTP Request
--   7. Method: POST
--   8. URL: http://localhost:3000/api/v1/bookmarks/add/tasks/queue-consumer
--           (Update for production environment)
--   9. Timeout: 5000ms
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Only configure if the queue table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_add-bookmark-url-queue') THEN

    -- Clean up any manually created triggers/functions
    DROP TRIGGER IF EXISTS "add-bookmark-url-queue-webhook" ON "pgmq"."q_add-bookmark-url-queue";
    DROP FUNCTION IF EXISTS "pgmq"."notify_add_bookmark_url_queue"();

    -- Enable RLS on pgmq queue
    ALTER TABLE "pgmq"."q_add-bookmark-url-queue" ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy for queue access
    DROP POLICY IF EXISTS "auth-access" ON "pgmq"."q_add-bookmark-url-queue";
    CREATE POLICY "auth-access" ON "pgmq"."q_add-bookmark-url-queue"
      AS permissive FOR all TO authenticated USING (true);

    -- Grant permissions for queue tables
    GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "pgmq"."q_add-bookmark-url-queue" TO "authenticated";
    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."q_add-bookmark-url-queue" TO "service_role";

    -- Grant permissions for archive table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_add-bookmark-url-queue') THEN
      GRANT INSERT, SELECT ON TABLE "pgmq"."a_add-bookmark-url-queue" TO "authenticated";
      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."a_add-bookmark-url-queue" TO "service_role";
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. CRON JOB SETUP
-- ============================================================================
-- Configure scheduled job for archive cleanup using pg_cron extension
-- ----------------------------------------------------------------------------
-- Purpose: Delete archived messages from the add-bookmark-url-queue daily at 1:00 AM
-- Schedule: Every day at 1:00 AM (0 1 * * *)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Only create cron job if the archive table exists and pg_cron is available
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'a_add-bookmark-url-queue')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    
    -- Remove existing job if it exists (pg_cron doesn't have IF NOT EXISTS)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'add-bookmark-url-queue-cron') THEN
      PERFORM cron.unschedule('add-bookmark-url-queue-cron');
    END IF;
    
    -- Schedule the job to run daily at 1:00 AM
    PERFORM cron.schedule(
      'add-bookmark-url-queue-cron',  -- job name
      '0 1 * * *',                      -- cron schedule: daily at 1:00 AM
      $cmd$DELETE FROM pgmq."a_add-bookmark-url-queue"$cmd$  -- SQL to execute
    );
  END IF;
END $$;

