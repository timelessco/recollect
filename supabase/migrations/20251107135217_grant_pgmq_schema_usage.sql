-- Grant USAGE permission on pgmq schemas to all roles
-- This allows the pgmq_public wrapper functions to access the underlying pgmq schema
-- Fixes permission denied error when using queue operations via PostgREST API and service_role
-- For Local Development - Need to add local IP in Database Webhook - https://github.com/supabase/supabase/issues/13005#issuecomment-1624423896

GRANT USAGE ON SCHEMA pgmq TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA pgmq_public TO anon, authenticated, service_role;
