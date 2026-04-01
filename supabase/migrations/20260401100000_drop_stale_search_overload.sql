-- Drop stale 3-param overload of search_bookmarks_url_tag_scope.
--
-- PostgreSQL has two overloads:
--   3-param: (search_text, url_scope, tag_scope) — old, returns different columns
--   4-param: (search_text, url_scope, tag_scope, category_scope) — current
--
-- When category_scope is omitted (undefined → not in request body), PostgREST
-- routes to the 3-param overload which lacks added_categories and make_discoverable
-- columns, causing 503 errors when downstream filters reference those columns.
--
-- CREATE OR REPLACE only replaces exact signature matches, so the old 3-param
-- function was never removed when the 4-param version was introduced.

DROP FUNCTION IF EXISTS public.search_bookmarks_url_tag_scope(character varying, character varying, text[]);
