-- ============================================================================
-- MIGRATION: Add case-insensitive unique constraints for categories and tags
-- Created: 2025-12-22
-- Purpose: Prevent duplicate category/tag names with different cases (e.g., "Test" and "test")
-- ============================================================================
--
-- This migration:
--   1. Merges duplicate categories (keeps entry with most bookmarks, tie-break by lowest id)
--   2. Merges duplicate tags (keeps entry with most bookmarks, tie-break by lowest id)
--   3. Creates case-insensitive unique index on categories (user_id, LOWER(category_name))
--   4. Creates case-insensitive unique index on tags (user_id, LOWER(name))
--
-- These constraints ensure that users cannot create duplicate category/tag names
-- that differ only by case, preventing confusion and data inconsistency.
--
-- ============================================================================

BEGIN;
SET search_path = public, pg_temp;

-- ============================================================================
-- PART 1: Merge duplicate categories
-- ============================================================================

-- 1.1 Pre-flight: Log duplicate category count
DO $$
DECLARE
    v_duplicate_groups int;
    v_total_duplicates int;
BEGIN
    -- Count groups that have duplicates
    SELECT COUNT(*) INTO v_duplicate_groups
    FROM (
        SELECT user_id, LOWER(category_name) as lower_name
        FROM public.categories
        GROUP BY user_id, LOWER(category_name)
        HAVING COUNT(*) > 1
    ) dups;

    -- Count total duplicate entries (entries that will be removed)
    SELECT COALESCE(SUM(cnt - 1), 0) INTO v_total_duplicates
    FROM (
        SELECT user_id, LOWER(category_name) as lower_name, COUNT(*) as cnt
        FROM public.categories
        GROUP BY user_id, LOWER(category_name)
        HAVING COUNT(*) > 1
    ) dups;

    RAISE NOTICE 'Categories: Found % duplicate groups with % total entries to merge', v_duplicate_groups, v_total_duplicates;
END $$;

-- 1.2 Reassign bookmark_categories from duplicates to keepers
-- Uses CTE to identify keepers (most bookmarks, tie-break by lowest id)
WITH category_bookmark_counts AS (
    SELECT
        c.id,
        c.user_id,
        LOWER(c.category_name) as lower_name,
        COUNT(bc.bookmark_id) as bookmark_count
    FROM public.categories c
    LEFT JOIN public.bookmark_categories bc ON bc.category_id = c.id
    GROUP BY c.id, c.user_id, LOWER(c.category_name)
),
keepers AS (
    SELECT DISTINCT ON (user_id, lower_name)
        id as keeper_id,
        user_id,
        lower_name
    FROM category_bookmark_counts
    ORDER BY user_id, lower_name, bookmark_count DESC, id ASC
),
duplicates AS (
    SELECT c.id as duplicate_id, k.keeper_id
    FROM public.categories c
    JOIN keepers k ON k.user_id = c.user_id AND k.lower_name = LOWER(c.category_name)
    WHERE c.id != k.keeper_id
)
-- Update bookmark_categories: point duplicates to keepers
-- ON CONFLICT DO NOTHING handles case where keeper already has that bookmark
INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id, created_at)
SELECT bc.bookmark_id, d.keeper_id, bc.user_id, bc.created_at
FROM public.bookmark_categories bc
JOIN duplicates d ON bc.category_id = d.duplicate_id
ON CONFLICT (bookmark_id, category_id) DO NOTHING;

-- 1.3 Delete bookmark_categories entries pointing to duplicates (now reassigned)
WITH category_bookmark_counts AS (
    SELECT
        c.id,
        c.user_id,
        LOWER(c.category_name) as lower_name,
        COUNT(bc.bookmark_id) as bookmark_count
    FROM public.categories c
    LEFT JOIN public.bookmark_categories bc ON bc.category_id = c.id
    GROUP BY c.id, c.user_id, LOWER(c.category_name)
),
keepers AS (
    SELECT DISTINCT ON (user_id, lower_name)
        id as keeper_id,
        user_id,
        lower_name
    FROM category_bookmark_counts
    ORDER BY user_id, lower_name, bookmark_count DESC, id ASC
),
duplicates AS (
    SELECT c.id as duplicate_id
    FROM public.categories c
    JOIN keepers k ON k.user_id = c.user_id AND k.lower_name = LOWER(c.category_name)
    WHERE c.id != k.keeper_id
)
DELETE FROM public.bookmark_categories
WHERE category_id IN (SELECT duplicate_id FROM duplicates);

-- 1.4 Delete duplicate categories (keeping the keeper)
WITH category_bookmark_counts AS (
    SELECT
        c.id,
        c.user_id,
        LOWER(c.category_name) as lower_name,
        COUNT(bc.bookmark_id) as bookmark_count
    FROM public.categories c
    LEFT JOIN public.bookmark_categories bc ON bc.category_id = c.id
    GROUP BY c.id, c.user_id, LOWER(c.category_name)
),
keepers AS (
    SELECT DISTINCT ON (user_id, lower_name)
        id as keeper_id,
        user_id,
        lower_name
    FROM category_bookmark_counts
    ORDER BY user_id, lower_name, bookmark_count DESC, id ASC
),
duplicates AS (
    SELECT c.id as duplicate_id
    FROM public.categories c
    JOIN keepers k ON k.user_id = c.user_id AND k.lower_name = LOWER(c.category_name)
    WHERE c.id != k.keeper_id
)
DELETE FROM public.categories
WHERE id IN (SELECT duplicate_id FROM duplicates);

-- 1.5 Post-migration verification for categories
DO $$
DECLARE
    v_remaining_duplicates int;
BEGIN
    SELECT COUNT(*) INTO v_remaining_duplicates
    FROM (
        SELECT user_id, LOWER(category_name) as lower_name
        FROM public.categories
        GROUP BY user_id, LOWER(category_name)
        HAVING COUNT(*) > 1
    ) dups;

    IF v_remaining_duplicates > 0 THEN
        RAISE EXCEPTION 'Category merge failed: % duplicate groups still exist. Rolling back.', v_remaining_duplicates;
    END IF;

    RAISE NOTICE 'Categories: All duplicates merged successfully';
END $$;

-- ============================================================================
-- PART 2: Merge duplicate tags
-- ============================================================================

-- 2.1 Pre-flight: Log duplicate tag count
DO $$
DECLARE
    v_duplicate_groups int;
    v_total_duplicates int;
BEGIN
    -- Count groups that have duplicates
    SELECT COUNT(*) INTO v_duplicate_groups
    FROM (
        SELECT user_id, LOWER(name) as lower_name
        FROM public.tags
        GROUP BY user_id, LOWER(name)
        HAVING COUNT(*) > 1
    ) dups;

    -- Count total duplicate entries (entries that will be removed)
    SELECT COALESCE(SUM(cnt - 1), 0) INTO v_total_duplicates
    FROM (
        SELECT user_id, LOWER(name) as lower_name, COUNT(*) as cnt
        FROM public.tags
        GROUP BY user_id, LOWER(name)
        HAVING COUNT(*) > 1
    ) dups;

    RAISE NOTICE 'Tags: Found % duplicate groups with % total entries to merge', v_duplicate_groups, v_total_duplicates;
END $$;

-- 2.2 Reassign bookmark_tags from duplicates to keepers
-- Uses CTE to identify keepers (most bookmarks, tie-break by lowest id)
WITH tag_bookmark_counts AS (
    SELECT
        t.id,
        t.user_id,
        LOWER(t.name) as lower_name,
        COUNT(bt.bookmark_id) as bookmark_count
    FROM public.tags t
    LEFT JOIN public.bookmark_tags bt ON bt.tag_id = t.id
    GROUP BY t.id, t.user_id, LOWER(t.name)
),
keepers AS (
    SELECT DISTINCT ON (user_id, lower_name)
        id as keeper_id,
        user_id,
        lower_name
    FROM tag_bookmark_counts
    ORDER BY user_id, lower_name, bookmark_count DESC, id ASC
),
duplicates AS (
    SELECT t.id as duplicate_id, k.keeper_id
    FROM public.tags t
    JOIN keepers k ON k.user_id = t.user_id AND k.lower_name = LOWER(t.name)
    WHERE t.id != k.keeper_id
)
-- Update bookmark_tags: point duplicates to keepers
-- ON CONFLICT DO NOTHING handles case where keeper already has that bookmark
INSERT INTO public.bookmark_tags (bookmark_id, tag_id, user_id, created_at)
SELECT bt.bookmark_id, d.keeper_id, bt.user_id, bt.created_at
FROM public.bookmark_tags bt
JOIN duplicates d ON bt.tag_id = d.duplicate_id
ON CONFLICT (bookmark_id, tag_id) DO NOTHING;

-- 2.3 Delete bookmark_tags entries pointing to duplicates (now reassigned)
WITH tag_bookmark_counts AS (
    SELECT
        t.id,
        t.user_id,
        LOWER(t.name) as lower_name,
        COUNT(bt.bookmark_id) as bookmark_count
    FROM public.tags t
    LEFT JOIN public.bookmark_tags bt ON bt.tag_id = t.id
    GROUP BY t.id, t.user_id, LOWER(t.name)
),
keepers AS (
    SELECT DISTINCT ON (user_id, lower_name)
        id as keeper_id,
        user_id,
        lower_name
    FROM tag_bookmark_counts
    ORDER BY user_id, lower_name, bookmark_count DESC, id ASC
),
duplicates AS (
    SELECT t.id as duplicate_id
    FROM public.tags t
    JOIN keepers k ON k.user_id = t.user_id AND k.lower_name = LOWER(t.name)
    WHERE t.id != k.keeper_id
)
DELETE FROM public.bookmark_tags
WHERE tag_id IN (SELECT duplicate_id FROM duplicates);

-- 2.4 Delete duplicate tags (keeping the keeper)
WITH tag_bookmark_counts AS (
    SELECT
        t.id,
        t.user_id,
        LOWER(t.name) as lower_name,
        COUNT(bt.bookmark_id) as bookmark_count
    FROM public.tags t
    LEFT JOIN public.bookmark_tags bt ON bt.tag_id = t.id
    GROUP BY t.id, t.user_id, LOWER(t.name)
),
keepers AS (
    SELECT DISTINCT ON (user_id, lower_name)
        id as keeper_id,
        user_id,
        lower_name
    FROM tag_bookmark_counts
    ORDER BY user_id, lower_name, bookmark_count DESC, id ASC
),
duplicates AS (
    SELECT t.id as duplicate_id
    FROM public.tags t
    JOIN keepers k ON k.user_id = t.user_id AND k.lower_name = LOWER(t.name)
    WHERE t.id != k.keeper_id
)
DELETE FROM public.tags
WHERE id IN (SELECT duplicate_id FROM duplicates);

-- 2.5 Post-migration verification for tags
DO $$
DECLARE
    v_remaining_duplicates int;
BEGIN
    SELECT COUNT(*) INTO v_remaining_duplicates
    FROM (
        SELECT user_id, LOWER(name) as lower_name
        FROM public.tags
        GROUP BY user_id, LOWER(name)
        HAVING COUNT(*) > 1
    ) dups;

    IF v_remaining_duplicates > 0 THEN
        RAISE EXCEPTION 'Tag merge failed: % duplicate groups still exist. Rolling back.', v_remaining_duplicates;
    END IF;

    RAISE NOTICE 'Tags: All duplicates merged successfully';
END $$;

-- ============================================================================
-- PART 3: Create case-insensitive unique indexes
-- ============================================================================

-- 3.1 Create case-insensitive unique index for categories
-- Prevents "Test" and "test" from existing for the same user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_category_name_ci
    ON public.categories (user_id, LOWER(category_name));

COMMENT ON INDEX public.unique_user_category_name_ci IS
'Case-insensitive unique constraint ensuring users cannot create duplicate category names that differ only by case (e.g., "Test" and "test").';

-- 3.2 Create case-insensitive unique index for tags
-- Prevents "JavaScript" and "javascript" from existing for the same user
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_tag_name_ci
    ON public.tags (user_id, LOWER(name));

COMMENT ON INDEX public.unique_user_tag_name_ci IS
'Case-insensitive unique constraint ensuring users cannot create duplicate tag names that differ only by case (e.g., "JavaScript" and "javascript").';

COMMIT;
