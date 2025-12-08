-- Run this script after seeding to populate the bookmark_categories junction table
-- This is needed because the migration runs before seed data is loaded

-- Migrate bookmarks with specific categories
INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id, created_at)
SELECT e.id, e.category_id, e.user_id, e.inserted_at
FROM public.everything e
WHERE e.category_id IS NOT NULL AND e.category_id != 0
ON CONFLICT (bookmark_id, category_id) DO NOTHING;

-- Handle uncategorized bookmarks (category_id = 0 or NULL)
INSERT INTO public.bookmark_categories (bookmark_id, category_id, user_id, created_at)
SELECT e.id, 0, e.user_id, e.inserted_at
FROM public.everything e
WHERE e.category_id IS NULL OR e.category_id = 0
ON CONFLICT (bookmark_id, category_id) DO NOTHING;
