-- ============================================================================
-- MIGRATION: Production Schema Baseline
-- Created: 2025-11-05
-- Version: 1.0
-- Description: Complete database schema for Recollect bookmark manager with
--              AI-powered search, category management, and user collaboration
--
-- IMPORTANT SECURITY NOTES:
-- - RLS policies currently allow all authenticated users to access all data
-- - Storage policies allow public read access
-- - Anonymous users have full table access
-- - Webhook URL is hardcoded to development environment
-- ============================================================================

-- ============================================================================
-- 1. SESSION CONFIGURATION
-- ============================================================================
-- Configure PostgreSQL session parameters for safe migration execution

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ============================================================================
-- 2. EXTENSIONS & SCHEMAS
-- ============================================================================
-- Install required PostgreSQL extensions and create custom schemas

-- Extension: pg_cron - Job scheduling for periodic tasks (monthly bookmark reset)
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";

-- Extension: pg_net - HTTP client for webhooks and external API calls
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Schema: pgmq_public - Public-facing message queue operations
CREATE SCHEMA IF NOT EXISTS "pgmq_public";
ALTER SCHEMA "pgmq_public" OWNER TO "postgres";

-- Extension: pgsodium - Encryption and security primitives
CREATE EXTENSION IF NOT EXISTS "pgsodium";

-- Public schema comment
COMMENT ON SCHEMA "public" IS 'standard public schema';

-- Extension: citext - Case-insensitive text type (for bookmark titles)
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "extensions";

-- Extension: pg_graphql - GraphQL API support
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

-- Extension: pg_stat_statements - Query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

-- Extension: pg_trgm - Trigram matching for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";

-- Extension: pgcrypto - Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Schema: pgmq - Message queue system internals
CREATE SCHEMA IF NOT EXISTS "pgmq";

-- Extension: pgmq - PostgreSQL message queue for async job processing
CREATE EXTENSION IF NOT EXISTS "pgmq" WITH SCHEMA "pgmq";

-- Extension: supabase_vault - Secrets management
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

-- Extension: uuid-ossp - UUID generation functions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Extension: vector - Vector similarity search for AI embeddings (768 dimensions)
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";

-- ============================================================================
-- 3. FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Message Queue Functions (pgmq_public schema)
-- ----------------------------------------------------------------------------
-- Public wrapper functions for PGMQ operations with proper security context

-- Function: archive() - Move message from queue to permanent storage
CREATE OR REPLACE FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$ begin return pgmq.archive( queue_name := queue_name, msg_id := message_id ); end; $$;

ALTER FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) OWNER TO "postgres";
COMMENT ON FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) IS 'Archives a message by moving it from the queue to a permanent archive.';

GRANT ALL ON FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "pgmq_public"."archive"("queue_name" "text", "message_id" bigint) TO "authenticated";

-- Function: delete() - Permanently remove message from queue
CREATE OR REPLACE FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$ begin return pgmq.delete( queue_name := queue_name, msg_id := message_id ); end; $$;

ALTER FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) OWNER TO "postgres";
COMMENT ON FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) IS 'Permanently deletes a message from the specified queue.';

GRANT ALL ON FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "pgmq_public"."delete"("queue_name" "text", "message_id" bigint) TO "authenticated";

-- Function: pop() - Retrieve and lock next message
CREATE OR REPLACE FUNCTION "pgmq_public"."pop"("queue_name" "text") RETURNS SETOF "pgmq"."message_record"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$ begin return query select * from pgmq.pop( queue_name := queue_name ); end; $$;

ALTER FUNCTION "pgmq_public"."pop"("queue_name" "text") OWNER TO "postgres";
COMMENT ON FUNCTION "pgmq_public"."pop"("queue_name" "text") IS 'Retrieves and locks the next message from the specified queue.';

GRANT ALL ON FUNCTION "pgmq_public"."pop"("queue_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "pgmq_public"."pop"("queue_name" "text") TO "anon";
GRANT ALL ON FUNCTION "pgmq_public"."pop"("queue_name" "text") TO "authenticated";

-- Function: read() - Read messages without removing them
CREATE OR REPLACE FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) RETURNS SETOF "pgmq"."message_record"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$ begin return query select * from pgmq.read( queue_name := queue_name, vt := sleep_seconds, qty := n ); end; $$;

ALTER FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) IS 'Reads up to "n" messages from the specified queue with an optional "sleep_seconds" (visibility timeout).';

GRANT ALL ON FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) TO "service_role";
GRANT ALL ON FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) TO "anon";
GRANT ALL ON FUNCTION "pgmq_public"."read"("queue_name" "text", "sleep_seconds" integer, "n" integer) TO "authenticated";

-- Function: send() - Send single message to queue
CREATE OR REPLACE FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer DEFAULT 0) RETURNS SETOF bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$ begin return query select * from pgmq.send( queue_name := queue_name, msg := message, delay := sleep_seconds ); end; $$;

ALTER FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) IS 'Sends a message to the specified queue, optionally delaying its availability by a number of seconds.';

GRANT ALL ON FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) TO "service_role";
GRANT ALL ON FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "pgmq_public"."send"("queue_name" "text", "message" "jsonb", "sleep_seconds" integer) TO "authenticated";

-- Function: send_batch() - Send multiple messages at once
CREATE OR REPLACE FUNCTION "pgmq_public"."send_batch"("queue_name" "text", "messages" "jsonb"[], "sleep_seconds" integer DEFAULT 0) RETURNS SETOF bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$ begin return query select * from pgmq.send_batch( queue_name := queue_name, msgs := messages, delay := sleep_seconds ); end; $$;

ALTER FUNCTION "pgmq_public"."send_batch"("queue_name" "text", "messages" "jsonb"[], "sleep_seconds" integer) OWNER TO "postgres";
COMMENT ON FUNCTION "pgmq_public"."send_batch"("queue_name" "text", "messages" "jsonb"[], "sleep_seconds" integer) IS 'Sends a batch of messages to the specified queue, optionally delaying their availability by a number of seconds.';

GRANT ALL ON FUNCTION "pgmq_public"."send_batch"("queue_name" "text", "messages" "jsonb"[], "sleep_seconds" integer) TO "service_role";
GRANT ALL ON FUNCTION "pgmq_public"."send_batch"("queue_name" "text", "messages" "jsonb"[], "sleep_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "pgmq_public"."send_batch"("queue_name" "text", "messages" "jsonb"[], "sleep_seconds" integer) TO "authenticated";

-- ----------------------------------------------------------------------------
-- 3.2 Business Logic Functions (public schema)
-- ----------------------------------------------------------------------------

-- Function: handle_new_user() - Auto-create profile for new auth users
-- Trigger: on_auth_user_created (AFTER INSERT ON auth.users)
-- Purpose: Ensures every authenticated user has a corresponding profile row
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id,email)
  values (new.id, new.email);
  return new;
end;
$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

-- Function: match_documents() - Vector similarity search for AI embeddings
-- Purpose: Find semantically similar documents using pgvector
-- Features: 768-dimensional vectors, JSONB metadata filtering, nearest neighbor search
-- Used by: AI search feature in dashboard
CREATE OR REPLACE FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_count" integer DEFAULT NULL::integer, "filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" bigint, "content" "text", "metadata" "jsonb", "embedding" "jsonb", "similarity" double precision)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
begin
  return query
  select
    id,
    content,
    metadata,
    (embedding::text)::jsonb as embedding,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where metadata @> filter
  order by documents.embedding <=> query_embedding
  limit match_count;
end;
$$;

ALTER FUNCTION "public"."match_documents"("query_embedding" "extensions"."vector", "match_count" integer, "filter" "jsonb") OWNER TO "postgres";

-- Function: search_bookmarks() - Full-text search across bookmarks
-- Purpose: Search bookmark titles, descriptions, and AI-generated metadata
-- Features: Fuzzy matching via pg_trgm, JSONB search for img_caption and OCR text
CREATE OR REPLACE FUNCTION "public"."search_bookmarks"("search_text" character varying) RETURNS TABLE("id" bigint, "user_id" "uuid", "inserted_at" timestamp with time zone, "title" "extensions"."citext", "url" "text", "description" "text", "ogimage" "text", "screenshot" "text", "category_id" bigint, "trash" boolean, "type" "text", "meta_data" "jsonb", "sort_index" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$BEGIN
    RETURN QUERY
        SELECT
            b.id,
            b.user_id,
            b.inserted_at,
            b.title,
            b.url,
            b.description,
            b."ogImage",
            b.screenshot,
            b.category_id,
            b.trash,
            b.type,
            b.meta_data,
            b.sort_index
        FROM bookmarks_table b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$$;

ALTER FUNCTION "public"."search_bookmarks"("search_text" character varying) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."search_bookmarks"("search_text" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."search_bookmarks"("search_text" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_bookmarks"("search_text" character varying) TO "service_role";

-- Function: search_bookmarks_debug() - Simplified search for debugging
-- Purpose: Returns minimal fields for troubleshooting search issues
-- Note: Drop existing function first to allow signature change
DROP FUNCTION IF EXISTS "public"."search_bookmarks_debug"("search_text" "text");
CREATE OR REPLACE FUNCTION "public"."search_bookmarks_debug"("search_text" "text") RETURNS TABLE("id" bigint, "title" "text", "has_meta" boolean, "caption" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$BEGIN
    RETURN QUERY
        SELECT
            b.id,
            b.title::text,
            (b.meta_data IS NOT NULL) as has_meta,
            COALESCE(b.meta_data->>'img_caption', '') as caption
        FROM bookmarks_table b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$$;

ALTER FUNCTION "public"."search_bookmarks_debug"("search_text" "text") OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."search_bookmarks_debug"("search_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_bookmarks_debug"("search_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_bookmarks_debug"("search_text" "text") TO "service_role";

-- Function: search_bookmarks_debugging() - Full search with wildcard return
-- Purpose: Development/testing function returning all columns
-- Note: Drop existing function first to allow signature change
DROP FUNCTION IF EXISTS "public"."search_bookmarks_debugging"("search_text" character varying);
CREATE OR REPLACE FUNCTION "public"."search_bookmarks_debugging"("search_text" character varying) RETURNS TABLE("id" bigint, "user_id" "uuid", "inserted_at" timestamp with time zone, "title" "extensions"."citext", "url" "text", "description" "text", "ogimage" "text", "screenshot" "text", "category_id" bigint, "trash" boolean, "type" "text", "meta_data" "jsonb", "sort_index" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$BEGIN
    RETURN QUERY
        SELECT *
        FROM bookmarks_table b
        WHERE
            (search_text % ANY(STRING_TO_ARRAY(b.title || b.description, ' ')))
            OR EXISTS (
                SELECT 1
                FROM jsonb_each_text(b.meta_data) x(key, value)
                WHERE key IN ('img_caption', 'ocr')
                  AND value ILIKE '%' || search_text || '%'
            );
END;$$;

ALTER FUNCTION "public"."search_bookmarks_debugging"("search_text" character varying) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."search_bookmarks_debugging"("search_text" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."search_bookmarks_debugging"("search_text" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_bookmarks_debugging"("search_text" character varying) TO "service_role";

-- ============================================================================
-- 4. TABLES
-- ============================================================================
-- Tables organized in dependency order with complete definitions
-- Each table includes: definition, constraints, indexes, foreign keys, RLS, grants

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- ----------------------------------------------------------------------------
-- Table: profiles
-- Purpose: User profile information and preferences
-- Dependencies: auth.users (Supabase Auth system)
-- RLS: Enabled - currently allows all authenticated users to read all profiles
--      TODO: Consider if profiles should be more restricted
-- Notes: Auto-created by handle_new_user() trigger when user signs up
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL PRIMARY KEY,
    "email" "text",
    "user_name" character varying,
    "profile_pic" character varying,
    "bookmarks_view" json DEFAULT '{ 	"moodboardColumns": [ 		30 	], 	"cardContentViewArray": ["cover", "title", "info"], 	"bookmarksView": "moodboard", 	"sortBy": "date-sort-acending" }'::json,
    "category_order" bigint[],
    "display_name" "text",
    "provider" "text",
    "api_key" "text",
    "bookmark_count" numeric DEFAULT '0'::numeric,
    CONSTRAINT "bookmarks_view_check" CHECK (((("bookmarks_view" -> 'moodboardColumns'::"text") IS NOT NULL) AND (("bookmarks_view" -> 'cardContentViewArray'::"text") IS NOT NULL) AND (("bookmarks_view" -> 'bookmarksView'::"text") IS NOT NULL) AND (("bookmarks_view" -> 'sortBy'::"text") IS NOT NULL))),
    CONSTRAINT "profiles_display_name_check" CHECK ((("length"("display_name") < 100) AND ("display_name" ~ '^[a-zA-Z0-9\s]+$'::"text")))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

COMMENT ON COLUMN "public"."profiles"."display_name" IS 'This is the user name used to display in the UI this need not be unique';
COMMENT ON COLUMN "public"."profiles"."provider" IS 'user login provider got from auth table';

-- Note: Primary key is defined inline in CREATE TABLE statement above

-- Unique Constraints (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_name_key' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_user_name_key" UNIQUE ("user_name");
    END IF;
END $$;

-- Foreign Keys (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id");
    END IF;
END $$;

-- Row Level Security
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth acceess" ON "public"."profiles";
CREATE POLICY "auth acceess" ON "public"."profiles" TO "authenticated" USING (true);

-- Permissions
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."profiles" TO "service_role";

-- ----------------------------------------------------------------------------
-- Table: categories
-- Purpose: User-defined collections for organizing bookmarks
-- Dependencies: profiles
-- RLS: Enabled - currently allows all authenticated users to see all categories
--      TODO: Should filter by user_id = auth.uid()
-- Features: Public/private sharing, custom icons, view preferences, ordering
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category_name" "text",
    "user_id" "uuid",
    "category_slug" character varying NOT NULL,
    "is_public" boolean DEFAULT false NOT NULL,
    "icon" character varying DEFAULT 'star-04'::character varying,
    "category_views" json DEFAULT '{ 	"moodboardColumns": [ 		30 	], 	"cardContentViewArray": ["cover", "title", "info"], 	"bookmarksView": "moodboard", 	"sortBy": "date-sort-acending" }'::json,
    "order_index" bigint,
    "icon_color" "text" DEFAULT '#000000'::"text"
);

ALTER TABLE "public"."categories" OWNER TO "postgres";

-- Identity Column (conditional - only add if sequence doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories_id_seq' AND relkind = 'S') THEN
        ALTER TABLE "public"."categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME "public"."categories_id_seq"
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
    END IF;
END $$;

-- Primary Key (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'categories_pkey' AND conrelid = 'public.categories'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."categories"
            ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Unique Constraints (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_category_slug_key' AND conrelid = 'public.categories'::regclass) THEN
        ALTER TABLE ONLY "public"."categories" ADD CONSTRAINT "categories_category_slug_key" UNIQUE ("category_slug");
    END IF;
END $$;

-- Foreign Keys (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_user_id_fkey' AND conrelid = 'public.categories'::regclass) THEN
        ALTER TABLE ONLY "public"."categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");
    END IF;
END $$;

-- Row Level Security
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth access" ON "public"."categories";
CREATE POLICY "auth access" ON "public"."categories" TO "authenticated" USING (true);

-- Permissions
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."categories" TO "service_role";

GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";

-- ----------------------------------------------------------------------------
-- Table: tags
-- Purpose: User-defined labels for organizing bookmarks
-- Dependencies: auth.users
-- RLS: Enabled - currently allows all authenticated users to see all tags
--      TODO: Should filter by user_id = auth.uid()
-- Features: Simple name-based tagging system, many-to-many via bookmark_tags
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text",
    "user_id" "uuid"
);

ALTER TABLE "public"."tags" OWNER TO "postgres";

-- Identity Column (conditional - only add if sequence doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tags_id_seq' AND relkind = 'S') THEN
        ALTER TABLE "public"."tags" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME "public"."tags_id_seq"
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
    END IF;
END $$;

-- Primary Key (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tags_pkey' AND conrelid = 'public.tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."tags"
            ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Foreign Keys (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_user_id_fkey' AND conrelid = 'public.tags'::regclass) THEN
        ALTER TABLE ONLY "public"."tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");
    END IF;
END $$;

-- Row Level Security
ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth acceess" ON "public"."tags";
CREATE POLICY "auth acceess" ON "public"."tags" TO "authenticated" USING (true);

-- Permissions
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tags" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tags" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."tags" TO "service_role";

GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tags_id_seq" TO "service_role";

-- ----------------------------------------------------------------------------
-- Table: bookmarks_table
-- Purpose: Core table storing all user bookmarks (URLs, images, documents)
-- Dependencies: profiles, categories
-- RLS: Enabled - currently allows all authenticated users to access all bookmarks
--      TODO: Critical security issue - should filter by user_id = auth.uid()
-- Features:
--   - Support for different types (link, image, document, tweet)
--   - Rich metadata via JSONB (img_caption, OCR text, tweet data)
--   - OpenGraph data (title, description, ogImage)
--   - Category organization with default category (0)
--   - Soft delete via trash column
--   - Twitter bookmarks ordering via sort_index
--   - Unique constraint per category (same URL can exist in different categories)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."bookmarks_table" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "extensions"."citext",
    "url" "text",
    "description" "text",
    "ogImage" "text",
    "screenshot" "text",
    "category_id" bigint DEFAULT '0'::bigint NOT NULL,
    "trash" boolean DEFAULT false NOT NULL,
    "type" "text",
    "meta_data" "jsonb",
    "sort_index" "text"
);

ALTER TABLE "public"."bookmarks_table" OWNER TO "postgres";

COMMENT ON COLUMN "public"."bookmarks_table"."sort_index" IS 'tells the order to show the twitter bookmarks, this is got from twitter api';

-- Identity Column (conditional - only add if sequence doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bookmarks_table_id_seq' AND relkind = 'S') THEN
        ALTER TABLE "public"."bookmarks_table" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME "public"."bookmarks_table_id_seq"
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
    END IF;
END $$;

-- Primary Key (Note: constraint name "todos_pkey" is legacy, kept for compatibility)
-- Conditional - only add if doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'todos_pkey' AND conrelid = 'public.bookmarks_table'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."bookmarks_table"
            ADD CONSTRAINT "todos_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Indexes (idempotent - only create if doesn't exist)
CREATE INDEX IF NOT EXISTS "idx_title_description" ON "public"."bookmarks_table" USING "btree" ("title", "description");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_url_category_id" ON "public"."bookmarks_table" USING "btree" ("url", "category_id")
    WHERE (("category_id" IS NOT NULL) AND ("category_id" <> 0));

-- Foreign Keys (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_table_category_id_fkey' AND conrelid = 'public.bookmarks_table'::regclass) THEN
        ALTER TABLE ONLY "public"."bookmarks_table" ADD CONSTRAINT "bookmarks_table_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_table_user_id_fkey' AND conrelid = 'public.bookmarks_table'::regclass) THEN
        ALTER TABLE ONLY "public"."bookmarks_table" ADD CONSTRAINT "bookmarks_table_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");
    END IF;
END $$;

-- Row Level Security
ALTER TABLE "public"."bookmarks_table" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth access" ON "public"."bookmarks_table";
CREATE POLICY "auth access" ON "public"."bookmarks_table" TO "authenticated" USING (true);

-- Permissions
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookmarks_table" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookmarks_table" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookmarks_table" TO "service_role";

GRANT ALL ON SEQUENCE "public"."bookmarks_table_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bookmarks_table_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bookmarks_table_id_seq" TO "service_role";

-- ----------------------------------------------------------------------------
-- Table: bookmark_tags
-- Purpose: Many-to-many junction table connecting bookmarks and tags
-- Dependencies: bookmarks_table, tags, auth.users
-- RLS: Enabled - currently allows all authenticated users to access all associations
--      TODO: Should filter by user_id = auth.uid()
-- Features:
--   - Links bookmarks to tags for organization
--   - Unique constraint prevents duplicate tag-bookmark pairs
--   - User scoping for multi-tenant support
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."bookmark_tags" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bookmark_id" bigint NOT NULL,
    "tag_id" bigint NOT NULL,
    "user_id" "uuid"
);

ALTER TABLE "public"."bookmark_tags" OWNER TO "postgres";

-- Identity Column (conditional - only add if sequence doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'bookmark_tags_id_seq' AND relkind = 'S') THEN
        ALTER TABLE "public"."bookmark_tags" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME "public"."bookmark_tags_id_seq"
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
    END IF;
END $$;

-- Primary Key (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookmark_tags_pkey' AND conrelid = 'public.bookmark_tags'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."bookmark_tags"
            ADD CONSTRAINT "bookmark_tags_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Unique Constraints (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_tag_id_bookmark_id_pair' AND conrelid = 'public.bookmark_tags'::regclass) THEN
        ALTER TABLE ONLY "public"."bookmark_tags" ADD CONSTRAINT "unique_tag_id_bookmark_id_pair" UNIQUE ("tag_id", "bookmark_id");
    END IF;
END $$;

-- Foreign Keys (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmark_tags_bookmark_id_fkey' AND conrelid = 'public.bookmark_tags'::regclass) THEN
        ALTER TABLE ONLY "public"."bookmark_tags" ADD CONSTRAINT "bookmark_tags_bookmark_id_fkey" FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks_table"("id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmark_tags_tag_id_fkey' AND conrelid = 'public.bookmark_tags'::regclass) THEN
        ALTER TABLE ONLY "public"."bookmark_tags" ADD CONSTRAINT "bookmark_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmark_tags_user_id_fkey' AND conrelid = 'public.bookmark_tags'::regclass) THEN
        ALTER TABLE ONLY "public"."bookmark_tags" ADD CONSTRAINT "bookmark_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");
    END IF;
END $$;

-- Row Level Security
ALTER TABLE "public"."bookmark_tags" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth access" ON "public"."bookmark_tags";
CREATE POLICY "auth access" ON "public"."bookmark_tags" TO "authenticated" USING (true);

-- Permissions
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookmark_tags" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookmark_tags" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."bookmark_tags" TO "service_role";

GRANT ALL ON SEQUENCE "public"."bookmark_tags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."bookmark_tags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."bookmark_tags_id_seq" TO "service_role";

-- ----------------------------------------------------------------------------
-- Table: shared_categories
-- Purpose: Tracks category sharing and collaboration settings
-- Dependencies: categories, profiles
-- RLS: Enabled - currently allows all authenticated users to access all sharing records
--      TODO: Should filter by user_id = auth.uid() OR email = auth.jwt()->>'email'
-- Features:
--   - Email-based sharing invitations
--   - Edit vs view-only permissions
--   - Pending acceptance workflow
--   - Per-user view preferences for shared categories
--   - Owner tracking via user_id (category owner, not shared recipient)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."shared_categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category_id" bigint NOT NULL,
    "email" character varying,
    "edit_access" boolean DEFAULT false NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category_views" json DEFAULT '{   "moodboardColumns": [     30   ],   "cardContentViewArray": [     "cover",     "title",     "info"   ],   "bookmarksView": "moodboard",   "sortBy": "date-sort-acending" }'::json NOT NULL,
    "is_accept_pending" boolean DEFAULT true
);

ALTER TABLE "public"."shared_categories" OWNER TO "postgres";

COMMENT ON COLUMN "public"."shared_categories"."user_id" IS 'This is the collection owners user id';

-- Identity Column (conditional - only add if sequence doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'shared_categories_id_seq' AND relkind = 'S') THEN
        ALTER TABLE "public"."shared_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
            SEQUENCE NAME "public"."shared_categories_id_seq"
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1
        );
    END IF;
END $$;

-- Primary Key (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shared_categories_pkey' AND conrelid = 'public.shared_categories'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."shared_categories"
            ADD CONSTRAINT "shared_categories_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- Foreign Keys (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shared_categories_category_id_fkey' AND conrelid = 'public.shared_categories'::regclass) THEN
        ALTER TABLE ONLY "public"."shared_categories" ADD CONSTRAINT "shared_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shared_categories_user_id_fkey' AND conrelid = 'public.shared_categories'::regclass) THEN
        ALTER TABLE ONLY "public"."shared_categories" ADD CONSTRAINT "shared_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");
    END IF;
END $$;

-- Row Level Security
ALTER TABLE "public"."shared_categories" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth acceess" ON "public"."shared_categories";
CREATE POLICY "auth acceess" ON "public"."shared_categories" TO "authenticated" USING (true);

-- Permissions
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_categories" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_categories" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."shared_categories" TO "service_role";

GRANT ALL ON SEQUENCE "public"."shared_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."shared_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."shared_categories_id_seq" TO "service_role";

-- ----------------------------------------------------------------------------
-- Table: documents
-- Purpose: Stores vector embeddings for AI-powered semantic search
-- Dependencies: None (standalone table)
-- RLS: NOT ENABLED - Security issue, all users can access all embeddings
--      TODO: Add RLS and filter by user based on metadata
-- Features:
--   - 768-dimensional vector embeddings (Google Generative AI model: embedding-001)
--   - JSONB metadata for filtering (user_id, bookmark_id, etc.)
--   - Content text for reference
--   - Used by match_documents() function for similarity search
--   - Integrated with LangChain SupabaseVectorStore
-- Usage:
--   - Created via /api/v1/ai/embeddings/post.ts
--   - Searched via /api/v1/ai/search/get.ts
--   - Deleted via /api/v1/ai/embeddings/delete.ts
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" bigint NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "embedding" "extensions"."vector"(768)
);

-- Optimize storage for vector column (extended storage for large vectors)
ALTER TABLE ONLY "public"."documents" ALTER COLUMN "embedding" SET STORAGE EXTENDED;

ALTER TABLE "public"."documents" OWNER TO "postgres";

-- Sequence for ID generation (not using IDENTITY syntax for compatibility)
CREATE SEQUENCE IF NOT EXISTS "public"."documents_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE "public"."documents_id_seq" OWNER TO "postgres";
ALTER SEQUENCE "public"."documents_id_seq" OWNED BY "public"."documents"."id";

-- Set sequence as default for id column
ALTER TABLE ONLY "public"."documents" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."documents_id_seq"'::"regclass");

-- Primary Key (conditional - only add if doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documents_pkey' AND conrelid = 'public.documents'::regclass
    ) THEN
        ALTER TABLE ONLY "public"."documents"
            ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");
    END IF;
END $$;

-- NOTE: No Row Level Security enabled on this table (security issue)
-- TODO: Enable RLS and add policies based on metadata->>'user_id'

-- Permissions
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."documents" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."documents" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "public"."documents" TO "service_role";

GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."documents_id_seq" TO "service_role";

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger: on_auth_user_created
-- Purpose: Automatically create a profile row when a new user signs up
-- Function: handle_new_user()
-- Fires: AFTER INSERT on auth.users
-- Notes: Ensures data consistency between auth system and application profiles
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. MESSAGE QUEUE SETUP
-- ============================================================================
-- Configure pgmq (PostgreSQL Message Queue) for async job processing
-- Queue: ai-embeddings - Processes AI embedding generation jobs

-- ----------------------------------------------------------------------------
-- Step 1: Create Queue
-- Creates the ai-embeddings queue if it doesn't already exist
-- This must run before any seed data that inserts into queue tables
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.meta WHERE queue_name = 'ai-embeddings') THEN
    PERFORM pgmq.create('ai-embeddings');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Step 2: Configure Queue Permissions and Policies
-- Sets up RLS, grants, and webhook trigger for the queue
-- Only runs if the queue table was successfully created
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Only configure if the queue table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_ai-embeddings') THEN

    -- Enable RLS on pgmq queue
    ALTER TABLE "pgmq"."q_ai-embeddings" ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy for queue access
    DROP POLICY IF EXISTS "auth-access" ON "pgmq"."q_ai-embeddings";
    CREATE POLICY "auth-access" ON "pgmq"."q_ai-embeddings"
      AS permissive FOR all TO authenticated USING (true);

    -- Grant permissions for queue tables
    GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "pgmq"."q_ai-embeddings" TO "authenticated";
    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."q_ai-embeddings" TO "service_role";

    -- Grant permissions for archive table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_ai-embeddings') THEN
      GRANT INSERT, SELECT ON TABLE "pgmq"."a_ai-embeddings" TO "authenticated";
      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."a_ai-embeddings" TO "service_role";
    END IF;

    -- Create webhook trigger for queue
    -- SECURITY WARNING: URL is hardcoded to dev environment
    -- TODO: Use environment-based URL or move to seed.sql
    DROP TRIGGER IF EXISTS "ai-embeddings" ON "pgmq"."q_ai-embeddings";
    CREATE TRIGGER "ai-embeddings"
      AFTER DELETE ON "pgmq"."q_ai-embeddings"
      FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(
        'https://recollect-git-dev-timelessco.vercel.app/api/v1/twitter/ai-embeddings',
        'POST', '{}', '{}', '10000'
      );
  END IF;
END $$;

-- ============================================================================
-- 7. PUBLICATIONS
-- ============================================================================
-- Configure Supabase Realtime publication for real-time subscriptions

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

-- ============================================================================
-- 8. STORAGE POLICIES
-- ============================================================================
-- Configure Row Level Security policies for Supabase Storage
-- SECURITY WARNING: Current policies allow:
--   - Public read access (anyone can read all files)
--   - Authenticated users can insert/delete any files
-- TODO: Restrict to user-owned files using bucket_id and auth.uid()

DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "storage"."objects";
CREATE POLICY "Enable delete for authenticated users only" ON "storage"."objects"
  AS permissive FOR delete TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "storage"."objects";
CREATE POLICY "Enable insert for authenticated users only" ON "storage"."objects"
  AS permissive FOR insert TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON "storage"."objects";
CREATE POLICY "Enable read access for all users" ON "storage"."objects"
  AS permissive FOR select TO public USING (true);

-- ============================================================================
-- 9. SCHEMA PERMISSIONS
-- ============================================================================
-- Grant usage permissions on schemas to different roles

GRANT USAGE ON SCHEMA "pgmq_public" TO "anon";
GRANT USAGE ON SCHEMA "pgmq_public" TO "authenticated";
GRANT USAGE ON SCHEMA "pgmq_public" TO "service_role";

GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "postgres";

-- ============================================================================
-- 10. DEFAULT PRIVILEGES
-- ============================================================================
-- Set default permissions for future objects created by postgres role
-- These apply to all new sequences, functions, and tables in public schema

-- Default privileges for sequences
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

-- Default privileges for functions
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

-- Default privileges for tables
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO "service_role";
