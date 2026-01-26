-- Pre-seed cleanup: Remove data created by migrations and config.toml
-- that conflicts with pg_dump seed data
--
-- Affected sources:
--   - categories id=0: migration 20251107150000
--   - storage.buckets: config.toml [storage.buckets.*]

SET session_replication_role = replica;

DELETE FROM public.categories WHERE id = 0;
DELETE FROM storage.buckets WHERE id IN ('recollect', 'recollect-dev');
