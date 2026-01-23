#!/bin/bash
# Local database reset with seed data
# Handles conflicts between migration-seeded data and production dump

set -e

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

echo "Resetting database (migrations only)..."
npx supabase db reset --no-seed

echo "Cleaning up migration-seeded data..."
psql "$DB_URL" << 'SQL'
SET session_replication_role = replica;
DELETE FROM public.categories WHERE id = 0;
DELETE FROM storage.buckets WHERE id IN ('recollect', 'recollect-dev');
SQL

echo "Seeding from dump..."
psql "$DB_URL" -f supabase/seed.sql

echo "Done!"
