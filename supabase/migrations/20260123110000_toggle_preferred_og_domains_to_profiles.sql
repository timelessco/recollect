-- ============================================================================
-- Migration: Add preferred_og_domains column to profiles table
-- Created: 2026-01-23 
-- Purpose: Store user's preferred Open Graph domains for bookmark metadata
-- Affected: public.profiles table
-- ============================================================================

-- Add the preferred_og_domains column to store an array of domain names
-- This allows users to specify which domains they prefer for Open Graph metadata
-- NULL value indicates no preference has been set by the user

BEGIN;

ALTER TABLE public.profiles
ADD COLUMN preferred_og_domains text[];

-- Add descriptive comment for documentation
COMMENT ON COLUMN public.profiles.preferred_og_domains IS
'Array of preferred Open Graph domain names for bookmark metadata prioritization. NULL indicates no preference set.';

-- RPC: Toggle a preferred OG domain (add if absent, remove if present)
-- Uses auth.uid() so only the caller's profile is updated
-- Return columns named out_* to avoid ambiguity with table column preferred_og_domains
CREATE OR REPLACE FUNCTION public.toggle_preferred_og_domain(p_domain text)
RETURNS TABLE(out_id uuid, out_preferred_og_domains text[])
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row record;
BEGIN
  UPDATE public.profiles p
  SET preferred_og_domains = CASE
    WHEN p_domain = ANY(COALESCE(p.preferred_og_domains, '{}'))
    THEN array_remove(COALESCE(p.preferred_og_domains, '{}'), p_domain)
    ELSE array_append(COALESCE(p.preferred_og_domains, '{}'), p_domain)
  END
  WHERE p.id = auth.uid()
  RETURNING p.id, p.preferred_og_domains INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.preferred_og_domains;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_preferred_og_domain(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.toggle_preferred_og_domain(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_preferred_og_domain(text) TO authenticated;

COMMENT ON FUNCTION public.toggle_preferred_og_domain IS
'Toggles a preferred OG domain: adds if absent, removes if present. Returns id and preferred_og_domains.';

COMMIT;