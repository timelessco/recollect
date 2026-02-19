ALTER TABLE public.profiles
ADD COLUMN auto_assign_collections boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.auto_assign_collections IS
'When true, AI enrichment automatically assigns bookmarks to matching collections.';
