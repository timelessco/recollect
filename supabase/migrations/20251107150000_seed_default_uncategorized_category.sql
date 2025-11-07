-- Seed default uncategorized category
-- This category is required by the bookmarks_table foreign key constraint
-- All bookmarks without an explicit category reference this default category with id=0

INSERT INTO public.categories (id, category_name, category_slug, user_id, is_public)
VALUES (0, '00uncategorized', '00uncategorized', NULL, false)
ON CONFLICT (id) DO NOTHING;
