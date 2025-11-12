-- ============================================================================
-- MIGRATION: Drop documents table (AI embeddings feature removed)
-- Created: 2025-11-12
-- Purpose: Remove unused documents table after AI search feature removal
-- Related: Commit 81f009f4 - Remove AI search and embeddings features (#556)
-- ============================================================================

-- IMPORTANT: This table stored 768-dimensional vector embeddings for AI-powered search
-- The feature was completely removed from the codebase, making this table obsolete
-- No foreign keys or dependencies exist on this table

BEGIN;

-- ============================================================================
-- STEP 1: Revoke all permissions from the documents table
-- ============================================================================
-- Note: These revoke statements ensure clean permission removal before dropping
-- Wrapped in DO block to only execute if table exists

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'documents') THEN
        -- Revoke permissions from anon role
        REVOKE DELETE ON TABLE "public"."documents" FROM "anon";
        REVOKE INSERT ON TABLE "public"."documents" FROM "anon";
        REVOKE REFERENCES ON TABLE "public"."documents" FROM "anon";
        REVOKE SELECT ON TABLE "public"."documents" FROM "anon";
        REVOKE TRIGGER ON TABLE "public"."documents" FROM "anon";
        REVOKE TRUNCATE ON TABLE "public"."documents" FROM "anon";
        REVOKE UPDATE ON TABLE "public"."documents" FROM "anon";

        -- Revoke permissions from authenticated role
        REVOKE DELETE ON TABLE "public"."documents" FROM "authenticated";
        REVOKE INSERT ON TABLE "public"."documents" FROM "authenticated";
        REVOKE REFERENCES ON TABLE "public"."documents" FROM "authenticated";
        REVOKE SELECT ON TABLE "public"."documents" FROM "authenticated";
        REVOKE TRIGGER ON TABLE "public"."documents" FROM "authenticated";
        REVOKE TRUNCATE ON TABLE "public"."documents" FROM "authenticated";
        REVOKE UPDATE ON TABLE "public"."documents" FROM "authenticated";

        -- Revoke permissions from service_role
        REVOKE DELETE ON TABLE "public"."documents" FROM "service_role";
        REVOKE INSERT ON TABLE "public"."documents" FROM "service_role";
        REVOKE REFERENCES ON TABLE "public"."documents" FROM "service_role";
        REVOKE SELECT ON TABLE "public"."documents" FROM "service_role";
        REVOKE TRIGGER ON TABLE "public"."documents" FROM "service_role";
        REVOKE TRUNCATE ON TABLE "public"."documents" FROM "service_role";
        REVOKE UPDATE ON TABLE "public"."documents" FROM "service_role";
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop orphaned function that references documents table
-- ============================================================================
-- The match_documents function was used for vector similarity search
-- It becomes non-functional without the documents table
DROP FUNCTION IF EXISTS "public"."match_documents"("query_embedding" "extensions"."vector", "match_count" integer, "filter" "jsonb");

-- ============================================================================
-- STEP 3: Drop table constraints and indexes
-- ============================================================================
-- Use DO block to check if table exists before dropping constraint
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'documents') THEN
        ALTER TABLE "public"."documents" DROP CONSTRAINT IF EXISTS "documents_pkey";
    END IF;
END $$;

DROP INDEX IF EXISTS "public"."documents_pkey";

-- ============================================================================
-- STEP 4: Drop the documents table and its sequence
-- ============================================================================
-- This removes the table that stored:
-- - id: bigint primary key
-- - content: text for reference
-- - metadata: jsonb for filtering
-- - embedding: vector(768) for AI similarity search
DROP TABLE IF EXISTS "public"."documents";

-- Drop the associated sequence for ID generation
DROP SEQUENCE IF EXISTS "public"."documents_id_seq";

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES:
-- 1. Run: pnpm db:types (to regenerate TypeScript types)
-- 2. Note: "documents" in UI code refers to document file types, NOT this table
-- 3. The pgvector extension remains installed (verify if needed for other features)
-- 4. All AI search/embedding endpoints were removed in commit 81f009f4
-- ============================================================================