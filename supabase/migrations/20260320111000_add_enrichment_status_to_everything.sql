-- ============================================================================
-- Migration: Add enrichment_status column to everything table
-- Created: 2026-03-20
-- Purpose: Track AI enrichment skip state for tier-limited bookmarks
-- Affected: public.everything (add column)
-- ============================================================================

ALTER TABLE public.everything
ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending'
CONSTRAINT everything_enrichment_status_check CHECK (enrichment_status IN ('pending', 'enriched', 'skipped'));

COMMENT ON COLUMN public.everything.enrichment_status IS
'AI enrichment status: "pending" = awaiting enrichment, "enriched" = completed, "skipped" = skipped due to free plan limit.';
