-- Add is_favorite column to categories table
-- Allows users to pin collections to a dedicated "Favorites" section in the sidebar
ALTER TABLE public.categories
ADD COLUMN is_favorite boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.categories.is_favorite IS
'Whether this collection is marked as a favorite by the owner';
