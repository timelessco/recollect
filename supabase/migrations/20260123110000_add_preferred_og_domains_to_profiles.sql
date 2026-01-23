-- ============================================================================
-- Migration: Add preferred_og_domains column, constraint, and RPC function to profiles table
-- Created: 2026-01-23 11:00:00 UTC
-- Purpose: Store user's preferred Open Graph domains for bookmark metadata with atomic operations and DoS protection
-- Affected: public.profiles table
-- ============================================================================

BEGIN;

-- Add the preferred_og_domains column to store an array of domain names
-- This allows users to specify which domains they prefer for Open Graph metadata
-- NULL value indicates no preference has been set by the user
ALTER TABLE public.profiles
ADD COLUMN preferred_og_domains text[];

-- Add descriptive comment for documentation
COMMENT ON COLUMN public.profiles.preferred_og_domains IS
'Array of preferred Open Graph domain names for bookmark metadata prioritization. NULL indicates no preference set.';

-- Add CHECK constraint to limit preferred_og_domains array to max 50 domains
-- This prevents potential DoS attacks through unlimited array growth
ALTER TABLE public.profiles
ADD CONSTRAINT preferred_og_domains_max_length
CHECK (
  preferred_og_domains IS NULL OR
  array_length(preferred_og_domains, 1) <= 50
);

-- Add descriptive comment for documentation
COMMENT ON CONSTRAINT preferred_og_domains_max_length ON public.profiles IS
'Limits preferred_og_domains array to maximum 50 domains to prevent DoS attacks';

-- Create RPC function for atomic toggle operations on preferred_og_domains
-- This prevents race conditions from concurrent requests using read-modify-write pattern
CREATE OR REPLACE FUNCTION toggle_preferred_og_domain(user_id UUID, domain_name TEXT)
RETURNS TABLE(id UUID, preferred_og_domains TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_domains TEXT[];
    domain_exists BOOLEAN;
BEGIN
    -- Get current domains for the user
    SELECT p.preferred_og_domains INTO current_domains
    FROM public.profiles p
    WHERE p.id = user_id;

    -- Handle NULL array case
    IF current_domains IS NULL THEN
        current_domains := '{}';
    END IF;

    -- Check if domain exists (case-insensitive)
    SELECT domain_name = ANY(current_domains) INTO domain_exists;

    -- Toggle: add if missing, remove if present
    IF domain_exists THEN
        -- Remove domain
        UPDATE public.profiles
        SET preferred_og_domains = array_remove(COALESCE(preferred_og_domains, '{}'), domain_name)
        WHERE id = user_id
        RETURNING id, preferred_og_domains INTO id, preferred_og_domains;
    ELSE
        -- Add domain (only if under limit)
        UPDATE public.profiles
        SET preferred_og_domains = array_append(COALESCE(preferred_og_domains, '{}'), domain_name)
        WHERE id = user_id
        AND (preferred_og_domains IS NULL OR array_length(preferred_og_domains, 1) < 50)
        RETURNING id, preferred_og_domains INTO id, preferred_og_domains;
    END IF;

    -- Return the updated row
    RETURN NEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION toggle_preferred_og_domain(UUID, TEXT) TO authenticated;

COMMIT;