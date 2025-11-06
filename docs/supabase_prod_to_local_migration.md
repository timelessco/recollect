# Supabase Production → Local Migration (Historical Reference)

**Status**: ✅ Completed - November 2025

This document serves as a historical record of how we migrated from a production-only Supabase setup to a proper local development environment with migrations. This process is now complete and documented for reference.

**For daily local development workflow**, see [`supabase_local_development.md`](./supabase_local_development.md)

---

## Overview

This was a one-time migration to establish:

- Local Docker-based Supabase development environment
- Migration file tracking system
- Production data dump for local development

## Initial Production State

### Database Structure

- **6 Main Tables**: bookmarks_table, categories, profiles, tags, bookmark_tags, shared_categories
- **0 Storage Buckets**: No storage buckets (removed from production)
- **1 Cron Job**: Monthly bookmark_count reset
- **9 RLS Policies**: Simple authenticated access policies
- **5 Custom Functions**: Including search_bookmarks, handle_new_user
- **11 Extensions**: Including pg_trgm, pg_cron, vector, pgmq
- **No Edge Functions** currently deployed
- **No existing migrations** (all changes made directly in DB)

---

## Migration Process

### Step 1: Initialize Supabase Project

```bash
# Initialize Supabase in your project
npx supabase init
```

This creates `supabase/` directory with config.toml and prepares migrations folder structure.

### Step 2: Link to Production Project

```bash
# First, login to Supabase (required before linking)
npx supabase login

# Then link to production (get project-ref from Supabase dashboard URL)
npx supabase link --project-ref <your-project-ref>
```

### Step 3: Start Local Supabase (Required for Schema Pull)

**IMPORTANT**: You must start local Supabase BEFORE pulling schema because the CLI uses a local shadow database to compare and generate migration files.

```bash
# Start Docker containers
npx supabase start
```

This starts local Supabase at `http://localhost:54321`.

### Step 4: Pull Production Schema

```bash
# Pull complete schema from production (uses local shadow DB for comparison)
npx supabase db pull
```

This creates `supabase/migrations/<timestamp>_remote_schema.sql` with ALL tables, functions, RLS policies, indexes.

### Step 5: Dump Production Data

**CRITICAL**: This preserves your dev accounts and existing data.

```bash
# Full data dump (includes ALL schemas: public, auth, etc.)
npx supabase db dump --data-only > supabase/seed.sql
```

This creates `supabase/seed.sql` with all your production data including auth users, profiles, bookmarks, categories, and all other tables.

### Step 6: Reset Local Database and Apply Migrations

Now that you have the initial migration file, reset the local database to apply it fresh:

```bash
# Reset local database (applies all migrations from supabase/migrations/)
npx supabase db reset
```

This resets the local database and **automatically applies all migration files** from `supabase/migrations/`.

**Important Post-Reset Checks:**

1. **Run database linting to catch issues:**

   ```bash
   npx supabase db lint
   ```

   Fix any errors reported (e.g., function return types, missing columns, security warnings).

2. **Run comprehensive schema diff to see all differences:**

   ```bash
   # Full diff including all Supabase schemas
   npx supabase db diff --linked --schema auth,cron,extensions,graphql,graphql_public,net,pgbouncer,pgmq,pgmq_public,pgsodium,pgsodium_masks,realtime,storage,supabase_functions,supabase_migrations,vault,public
   ```

   This shows differences including Supabase-managed functions and pgmq tables (which are auto-created).

3. **Run simple diff for final check:**

   ```bash
   # Basic diff to verify main schema is correct
   npx supabase db diff --linked
   ```

After fixing any issues found, your schema should be solidified and ready for data loading.

**Important Notes about Seed vs Migration:**

- **seed.sql contains**:
  - All data (INSERT statements)
  - Cron job creation (data operation: `SELECT cron.schedule(...)`)
  - May have duplicate trigger if not removed

- **Migration file contains**:
  - All schema definitions (CREATE TABLE, CREATE FUNCTION, etc.)
  - Auth trigger with `DROP TRIGGER IF EXISTS` (made idempotent)
  - pgmq queue creation and configuration
  - RLS policies and grants

**If you get a trigger error**: The auth trigger `on_auth_user_created` is now in the migration file. If seed.sql still has it, either:

1. Remove the trigger creation from seed.sql (recommended)
2. Or the migration's `DROP TRIGGER IF EXISTS` will handle duplicates

**Verify migrations were applied:**

```bash
# Check migration status
npx supabase migration list --local

# Verify tables were created
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

You should see all your tables: `bookmark_tags`, `bookmarks_table`, `categories`, `documents`, `profiles`, `shared_categories`, `tags`.

**Note**: `npx supabase db reset` automatically loaded the seed.sql data, so no separate data loading step is needed.

### Step 7: Configure Local Environment

Before running the dev server, configure your environment variables. Create or update `.env.local`:

```env
# Local Supabase Configuration
NEXT_PUBLIC_DEV_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY=<from_supabase_status_command>
DEV_SUPABASE_SERVICE_KEY=<from_supabase_status_command>

# Local Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google Auth (for local development)
DEV_SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-dev-supabase-auth-google-client-id
DEV_SUPABASE_AUTH_GOOGLE_SECRET=your-dev-supabase-auth-google-secret

# Copy other necessary env variables from your current .env
```

To get the required keys:

```bash
npx supabase status
```

Look for:

- `anon key` → `NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY`
- `service_role key` → `DEV_SUPABASE_SERVICE_KEY`

### Step 8: Test Local Environment

1. Start your Next.js app with local env: `npm run dev`
2. Login with existing dev account
3. Verify bookmarks are visible
4. Test search functionality
5. Check file uploads work
6. Verify categories and tags

**If everything works locally**, proceed to apply migrations to production.

### Step 9: Push Migrations to Production

**IMPORTANT**: Now that local is working, push the migration to production so it has a migration history:

```bash
# Push migrations to production (this enables Supabase branching)
npx supabase db push
```

This applies the migration to production and enables the Supabase migration tracking system.

### Step 10: Final Verification

```bash
# Check bookmark counts
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT COUNT(*) FROM bookmarks_table;"

# Check categories
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT COUNT(*) FROM categories;"

# Verify cron job
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "SELECT jobname, schedule, active FROM cron.job;"

# Check production migration status
npx supabase migration list
```

Verify that:

- Local and production both show the same migrations
- All migrations have been applied
- Data loads correctly

**✅ Local setup is now complete! Production has migrations enabled.**

---

## Troubleshooting

### Auth Issues

If authentication doesn't work:

```sql
-- Check auth.users data
SELECT id, email FROM auth.users LIMIT 5;

-- Verify profile links
SELECT p.id, p.email, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
LIMIT 5;
```

### Sequence Conflicts

If you get ID conflicts when inserting new data:

```sql
-- Reset sequences
SELECT setval('bookmarks_table_id_seq', (SELECT MAX(id) FROM bookmarks_table));
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags));
SELECT setval('bookmark_tags_id_seq', (SELECT MAX(id) FROM bookmark_tags));
SELECT setval('shared_categories_id_seq', (SELECT MAX(id) FROM shared_categories));
```

---

## Migration Artifacts

The following files were created during this migration:

- `supabase/migrations/20251105181644_prod_schema.sql` - Complete production schema
- `supabase/seed.sql` - Production data dump (gitignored)
- `supabase/config.toml` - Local Supabase configuration

---

## Outcome

✅ **Successfully established**:

- Local Docker-based development environment
- Migration tracking system
- Production schema baseline
- Seed data for local development

**Next**: See [`supabase_local_development.md`](./supabase_local_development.md) for daily development workflow.

---

**Migration Completed**: November 2025
**Migration File**: `20251105181644_prod_schema.sql`
**Document Version**: 1.0
