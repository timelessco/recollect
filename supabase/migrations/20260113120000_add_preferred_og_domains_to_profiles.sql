-- ============================================================================
-- Migration: Add preferred_og_domains column to profiles table
-- Created: 2026-01-13 12:00:00 UTC
-- Purpose: Store user's preferred Open Graph domains for bookmark metadata
-- Affected: public.profiles table
-- ============================================================================

-- Add the preferred_og_domains column to store an array of domain names
-- This allows users to specify which domains they prefer for Open Graph metadata
-- NULL value indicates no preference has been set by the user
BEGIN;

alter table public.profiles
add column preferred_og_domains text[];
COMMIT;
-- Add descriptive comment for documentation
comment on column public.profiles.preferred_og_domains is 
'Array of preferred Open Graph domain names for bookmark metadata prioritization. NULL indicates no preference set.';
