-- ============================================================================
-- Migration: Add enrichment columns to everything table
-- Created: 2026-03-20
-- Purpose: Track AI enrichment pipeline state for tier-limited bookmarks
-- Affected: public.everything (add columns)
-- ============================================================================

ALTER TABLE public.everything
ADD COLUMN IF NOT EXISTS enrichment_status TEXT
  DEFAULT 'pending'
  CONSTRAINT everything_enrichment_status_check
  CHECK (enrichment_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

COMMENT ON COLUMN public.everything.enrichment_status IS
'AI enrichment pipeline status. Default pending. skipped = free plan limit.';

ALTER TABLE public.everything
ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;

COMMENT ON COLUMN public.everything.enriched_at IS
'Timestamp of successful enrichment. NULL until completed.';
