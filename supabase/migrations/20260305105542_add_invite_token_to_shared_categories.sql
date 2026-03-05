-- Migration: Add invite_token column to shared_categories
-- Purpose: Replace JWT-based invite tokens with secure UUID tokens stored in the database
-- Affected tables: shared_categories

-- Add nullable invite_token column (existing rows get NULL — accepted invites don't need tokens)
alter table public.shared_categories
  add column invite_token uuid default null;

-- Partial unique index: ensures no duplicate tokens while allowing multiple NULLs for accepted invites
create unique index idx_shared_categories_invite_token
  on public.shared_categories (invite_token)
  where invite_token is not null;
