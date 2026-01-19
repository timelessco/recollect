-- ============================================================================
-- MIGRATION: Instagram Imports Queue Infrastructure
-- Purpose: Queue-based Instagram bookmark processing with atomic transactions
-- ============================================================================

BEGIN;

-- 1. Create dedicated queue for Instagram imports
SELECT pgmq.create('q_instagram_imports');

-- 2. Configure Queue Permissions and RLS (matching ai-embeddings pattern)
DO $$
BEGIN
  -- Only configure if the queue table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'pgmq'
             AND table_name = 'q_q_instagram_imports') THEN

    -- Enable RLS on pgmq queue
    ALTER TABLE "pgmq"."q_q_instagram_imports" ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy for queue access
    DROP POLICY IF EXISTS "auth-access" ON "pgmq"."q_q_instagram_imports";
    CREATE POLICY "auth-access" ON "pgmq"."q_q_instagram_imports"
      AS permissive FOR ALL TO authenticated USING (true);

    -- Grant permissions for queue tables
    GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "pgmq"."q_q_instagram_imports" TO "authenticated";
    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."q_q_instagram_imports" TO "service_role";

    -- Grant permissions for archive table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'pgmq'
               AND table_name = 'a_q_instagram_imports') THEN
      GRANT INSERT, SELECT ON TABLE "pgmq"."a_q_instagram_imports" TO "authenticated";
      GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "pgmq"."a_q_instagram_imports" TO "service_role";
    END IF;
  END IF;
END $$;

-- 3. Create stored procedure for atomic bookmark processing
CREATE OR REPLACE FUNCTION public.process_instagram_bookmark(
  p_url TEXT,
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_og_image TEXT DEFAULT NULL,
  p_meta_data JSONB DEFAULT '{}'::JSONB,
  p_collection_names TEXT[] DEFAULT '{}'::TEXT[]
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bookmark_id BIGINT;
  v_category_id BIGINT;
  v_category_ids BIGINT[] := '{}'::BIGINT[];
  v_collection_name TEXT;
  v_slug TEXT;
BEGIN
  -- Validate URL early (fail fast)
  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RAISE EXCEPTION 'URL cannot be null or empty';
  END IF;

  -- Step 1: Get or create categories
  IF p_collection_names IS NOT NULL AND array_length(p_collection_names, 1) > 0 THEN
    FOREACH v_collection_name IN ARRAY p_collection_names
    LOOP
      -- Skip empty names
      IF v_collection_name IS NOT NULL AND btrim(v_collection_name) != '' THEN
        -- Try to find existing category by name
        SELECT id INTO v_category_id
        FROM categories
        WHERE category_name = btrim(v_collection_name)
          AND user_id = p_user_id
        LIMIT 1;

        -- Create if not found
        IF v_category_id IS NULL THEN
          -- Generate unique slug following existing patterns:
          -- Twitter: slugify-{uniqid}-twitter
          -- Raindrop: slugify-rain_drop-{uniqid}
          -- Instagram: slugify-instagram-{random8}
          v_slug := lower(regexp_replace(btrim(v_collection_name), '[^a-zA-Z0-9]+', '-', 'g'))
                    || '-instagram-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);

          INSERT INTO categories (category_name, category_slug, user_id, icon, icon_color)
          VALUES (btrim(v_collection_name), v_slug, p_user_id, 'bookmark', '#ffffff')
          RETURNING id INTO v_category_id;
        END IF;

        v_category_ids := array_append(v_category_ids, v_category_id);
      END IF;
    END LOOP;
  END IF;

  -- Step 2: Insert bookmark into 'everything' table
  -- Note: No upsert - same URL can exist in different collections (by design)
  INSERT INTO everything (url, user_id, type, title, description, "ogImage", meta_data, trash)
  VALUES (p_url, p_user_id, p_type, p_title, p_description, p_og_image, p_meta_data, false)
  RETURNING id INTO v_bookmark_id;

  -- Step 3: Manage junction table (exclusive model)
  IF array_length(v_category_ids, 1) > 0 THEN
    -- Remove uncategorized (0) when adding real categories
    DELETE FROM bookmark_categories
    WHERE bookmark_id = v_bookmark_id
      AND category_id = 0
      AND user_id = p_user_id;

    -- Insert category associations using unnest() for efficiency
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    SELECT v_bookmark_id, unnest(v_category_ids), p_user_id
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  ELSE
    -- No categories: assign to uncategorized (0)
    INSERT INTO bookmark_categories (bookmark_id, category_id, user_id)
    VALUES (v_bookmark_id, 0, p_user_id)
    ON CONFLICT (bookmark_id, category_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'bookmark_id', v_bookmark_id,
    'category_ids', v_category_ids
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Log error details for debugging (appears in Postgres logs)
    RAISE WARNING 'process_instagram_bookmark failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    -- Re-raise to trigger rollback
    RAISE;
END;
$$;

-- Only service_role can call (worker uses service role)
REVOKE ALL ON FUNCTION public.process_instagram_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_instagram_bookmark(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT[]) TO service_role;

COMMENT ON FUNCTION public.process_instagram_bookmark IS
'Atomic Instagram bookmark processing: creates categories, inserts bookmark, manages junction table. Called by Edge Function worker.';

COMMIT;
