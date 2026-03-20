-- ============================================================================
-- Migration: Add enrichment_status column to everything table
-- Created: 2026-03-20
-- Purpose: Track AI enrichment skip state for tier-limited bookmarks
-- Affected: public.everything (add column)
-- ============================================================================

alter table public.everything
add column if not exists enrichment_status text;

comment on column public.everything.enrichment_status is
'AI enrichment status. NULL = enriched or pending, "skipped" = skipped due to free plan limit.';
