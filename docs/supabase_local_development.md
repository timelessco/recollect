# Supabase Local Development Workflow

This guide covers the day-to-day local development workflow for the Recollect project using Supabase Docker containers.

## Prerequisites

✅ **Production → Local migration completed** (November 2025)

If you need to understand how the initial migration was done, see:
📖 **[Production to Local Migration History](./supabase_prod_to_local_migration.md)**

📚 **Official Supabase Resources:**

- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction) - Complete CLI command documentation
- [Local Development Guide](https://supabase.com/docs/guides/local-development) - Official local development docs
- [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) - Migration best practices

---

## Quick Start

For developers joining the project:

1. **Clone the repository**
2. **Install dependencies**: `pnpm install`
3. **Ensure Docker is running** (Docker Desktop, OrbStack, Rancher Desktop, or Podman)
4. **Start local Supabase**: `npx supabase start`
5. **Configure environment**: Copy `.env.example` to `.env.local` and fill in local Supabase values
6. **Run dev server**: `pnpm run dev`

### Getting Local Supabase Credentials

After starting local Supabase, get your credentials:

```bash
npx supabase status
```

Look for:

- `API URL` → `NEXT_PUBLIC_DEV_SUPABASE_URL` (usually `http://localhost:54321`)
- `anon key` → `NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY`
- `service_role key` → `DEV_SUPABASE_SERVICE_KEY`

Update your `.env.local` with these values.

---

## Environment Configuration

### Local Development (.env.local)

```env
# Local Supabase Configuration
NEXT_PUBLIC_DEV_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_DEV_SUPABASE_ANON_KEY=<from_supabase_status>
DEV_SUPABASE_SERVICE_KEY=<from_supabase_status>

# Local Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Google Auth (for local development)
DEV_SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-dev-google-client-id
DEV_SUPABASE_AUTH_GOOGLE_SECRET=your-dev-google-secret

# Copy other necessary env variables from .env.example
```

---

## Daily Development Workflow

### Starting Your Day

```bash
# Start local Supabase (if not already running)
npx supabase start

# Check status
npx supabase status

# Start dev server
pnpm run dev
```

### Making Schema Changes

There are two recommended approaches for making schema changes:

#### Approach 1: Manual Migration (Recommended for experienced developers)

1. **Create a new migration file**:

   ```bash
   npx supabase migration new <migration_name>
   ```

2. **Write your SQL** in the generated file (`supabase/migrations/<timestamp>_<migration_name>.sql`)

3. **Apply the migration**:

   ```bash
   npx supabase migration up
   ```

4. **Verify the changes** in Studio (`http://localhost:54323`)

#### Approach 2: Auto Schema Diff (Great for prototyping)

1. **Make changes using Supabase Studio** (`http://localhost:54323`)

2. **Generate migration from changes**:

   ```bash
   npx supabase db diff -f <migration_name>
   ```

3. **Review the generated migration** in `supabase/migrations/`

4. **Test by resetting database**:

   ```bash
   pnpm db:reset # If using production dump
   # OR
   npx supabase db reset # If using minimal seed
   ```

5. **Verify everything works** with your app

**Note:** See [Database Reset](#database-reset) section for choosing the right command based on your seed data.

**Database Webhooks Setup**: After running migrations, enable the **Database Webhooks** integration in Supabase Studio under **Database → Integrations → Postgres Modules** to configure webhook triggers. When setting webhook URLs, use your local machine IP instead of `localhost`:

```text
http://<YOUR_LOCAL_IP>:3000/api/your-endpoint
```

Example (if your local IP is `192.168.1.100`):

```text
http://192.168.1.100:3000/api/v1/endpoint
```

See [Supabase GitHub Issue #13005](https://github.com/supabase/supabase/issues/13005#issuecomment-1624423896) - Docker localhost limitation with webhooks

### Useful Commands

#### Database Reset

Choose the appropriate reset command based on your seed data source:

| Command                 | Use When                                                                       |
| ----------------------- | ------------------------------------------------------------------------------ |
| `pnpm db:reset`         | Using production dump as seed (`supabase/seed.sql` from `db dump --data-only`) |
| `npx supabase db reset` | Using minimal/custom seed data or no seed file                                 |

**Why two commands?**

When using a production dump, migrations seed certain data (e.g., default categories) that also exists in the dump. This causes duplicate key conflicts. `pnpm db:reset` handles this by:

1. Running migrations without seeding (`--no-seed`)
2. Cleaning up migration-seeded data that conflicts with the dump
3. Loading the production dump

#### Database Operations

```bash
# Migration management
npx supabase migration new <name>      # Create a new migration file
npx supabase migration list            # List all migrations and their status
npx supabase migration up              # Apply pending migrations
pnpm db:reset                          # Reset DB with production dump (recommended)
npx supabase db reset                  # Reset DB with minimal seed data

# Schema operations
npx supabase db diff -f <name>         # Generate migration from schema changes
npx supabase db diff --linked          # Compare local with production schema
npx supabase db lint                   # Check for schema issues and best practices

# Data operations
npx supabase db dump --data-only > dump.sql  # Export data
npx supabase db push                   # Push migrations to remote (production)
npx supabase db pull                   # Pull schema from remote
```

#### Supabase Service Operations

```bash
# Container management
npx supabase start                     # Start all Docker containers
npx supabase stop                      # Stop containers (preserves data)
npx supabase stop --no-backup          # Stop and delete all data
npx supabase status                    # Show service URLs and credentials

# Authentication & linking
npx supabase login                     # Login to Supabase CLI
npx supabase link                      # Link to a remote project
npx supabase link --project-ref <ref>  # Link to specific project
```

#### Access Local Services

```bash
# Studio Dashboard: http://localhost:54323
# API Gateway: http://localhost:54321
# Database: postgresql://postgres:postgres@localhost:54322/postgres
# Mailpit (Email testing): http://localhost:54324
```

**Tip:** Run `npx supabase status` to see all service URLs and credentials at any time.

---

## Troubleshooting

### Docker and Container Issues

#### Docker not running

**Problem:** `Error: Cannot connect to Docker daemon`

**Solution:**

1. Ensure Docker Desktop (or alternative) is running
2. Check Docker is accessible: `docker ps`
3. If using Podman or other Docker alternatives, ensure Docker API compatibility is enabled

#### Container startup failures

**Problem:** Containers fail to start or crash repeatedly

**Solution:**

```bash
# Stop and clean up
npx supabase stop --no-backup
docker system prune -f

# Restart with fresh containers
npx supabase start
```

**Note:** If you're experiencing extension-related errors (pg_cron, pgmq, pg_net), see the [Extension creation failures](#extension-creation-failures-pg_cron-pgmq-pg_net) section below.

#### Outdated CLI version

**Problem:** Features not working or unexpected errors

**Solution:**

```bash
# Check current version
npx supabase --version

# Update to latest using pnpm
pnpm update supabase --save-dev
```

### Port Conflicts

#### Ports already in use

**Problem:** `Error: port 54321 already in use`

**Solution:**

```bash
# Stop Supabase first
npx supabase stop --no-backup

# Check what's using the ports
lsof -i :54321  # API Gateway
lsof -i :54322  # Database
lsof -i :54323  # Studio
lsof -i :54324  # Mailpit

# Kill process if needed (replace <PID> with actual process ID)
kill -9 <PID>

# Restart Supabase
npx supabase start
```

### Database and Migration Issues

#### Auth not working locally

**Problem:** Cannot authenticate users in local environment

**Solution:**

```sql
-- Check if users exist in auth schema
SELECT id, email FROM auth.users LIMIT 5;

-- Verify profile relationships
SELECT p.id, p.email, u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
LIMIT 5;

-- Check auth configuration in supabase/config.toml
-- Ensure enable_confirmations = false for local development
```

**Also check:** `supabase/config.toml` should have `enable_confirmations = false` for local development

#### Sequence conflicts (duplicate key errors)

**Problem:** `ERROR: duplicate key value violates unique constraint`

**Solution:**

```sql
-- Reset sequences to match current max IDs
SELECT setval('everything_id_seq', (SELECT MAX(id) FROM everything));
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags));
SELECT setval('bookmark_tags_id_seq', (SELECT MAX(id) FROM bookmark_tags));
SELECT setval('shared_categories_id_seq', (SELECT MAX(id) FROM shared_categories));
```

#### Migration out of sync

**Problem:** Local migrations don't match remote or failed migrations

**Solution:**

```bash
# Option 1: Reset local database (safe for local only)
npx supabase db reset

# Option 2: Pull latest from remote and regenerate
npx supabase db pull
npx supabase db reset

# Option 3: Check migration status
npx supabase migration list          # Local
npx supabase migration list --linked # Remote
```

#### Migration fails to apply

**Problem:** `ERROR: migration <timestamp> failed`

**Solution:**

1. Check migration syntax: `npx supabase db lint`
2. Review error message in terminal output
3. Fix SQL syntax in the migration file
4. Test with: `npx supabase db reset`

#### Extension creation failures (pg_cron, pgmq, pg_net)

**Problem:** `ERROR: permission denied to create extension` or `ERROR: function does not exist` during migration

**Common errors:**

- `permission denied to create extension "pg_cron"`
- `function pgmq.drop_queue(text) does not exist`
- Extensions fail to initialize properly

**Solution:**

The quickest fix is to remove the database volume and start fresh:

```bash
# Stop Supabase and delete all volumes (removes all local data)
npx supabase stop --no-backup

# Start fresh with clean containers
npx supabase start
```

**Why this works:**

- Some extensions (pg_cron, pgmq, pg_net) may have partial installations or corrupted state
- Removing volumes ensures a clean slate for extension initialization
- Extensions will install properly on fresh containers

**Alternative approach (if you need to preserve data):**

```bash
# Export your data first
npx supabase db dump --data-only > backup.sql

# Remove volumes and restart
npx supabase stop --no-backup
npx supabase start

# Restore your data
psql "postgresql://postgres:postgres@localhost:54322/postgres" < backup.sql
```

**Note:** These extensions are available in Supabase Cloud but may have limitations in local Docker environments. Your application will work fine without them for local development - only advanced features (cron jobs, message queues) will be unavailable locally.

#### Permission errors on tables

**Problem:** `ERROR: permission denied for table <name>`

**Solution:**

```sql
-- If table was created through Dashboard, reassign owner
ALTER TABLE <table_name> OWNER TO postgres;

-- Grant necessary permissions
GRANT ALL ON TABLE <table_name> TO postgres, anon, authenticated, service_role;
```

### Performance and Resource Issues

#### Slow database operations

**Problem:** Queries taking too long or timeouts

**Solution:**

1. Check Docker resource allocation (increase CPU/Memory in Docker Desktop settings)
2. Review query performance in Studio
3. Add appropriate indexes for frequently queried columns
4. Use `EXPLAIN ANALYZE` to identify slow queries

#### Running out of disk space

**Problem:** `ERROR: no space left on device`

**Solution:**

```bash
# Clean up Docker resources
docker system prune -a -f

# Remove old Supabase volumes (CAUTION: deletes data)
npx supabase stop --no-backup

# Restart fresh
npx supabase start
```

### Connection Issues

#### Cannot connect to database

**Problem:** Application can't connect to local database

**Solution:**

1. Verify Supabase is running: `npx supabase status`
2. Check connection string in `.env.local`
3. Ensure you're using the correct port (54322 for direct DB access)
4. Try connecting with psql to verify: `psql "postgresql://postgres:postgres@localhost:54322/postgres"`

#### Edge Functions can't access database

**Problem:** Local edge functions can't connect to database

**Solution:**

Replace `localhost` with `host.docker.internal` in database connection strings within edge functions:

```typescript
// ✅ Correct for edge functions
const supabaseUrl = "http://host.docker.internal:54321";

// ❌ Wrong - won't work in Docker container
const supabaseUrl = "http://localhost:54321";
```

### Getting Help

If none of these solutions work:

1. Check [Supabase CLI GitHub Issues](https://github.com/supabase/cli/issues)
2. Search [Supabase Discussions](https://github.com/orgs/supabase/discussions)
3. Run with debug flag: `npx supabase start --debug`
4. Check Docker logs: `docker logs <container_id>`

---

## Best Practices

### Development Workflow

1. **Always work with migrations in version control**
   - Never make schema changes directly in production
   - All changes should go through: local → migration → commit → deploy

2. **Use descriptive migration names**

   ```bash
   # ✅ Good
   npx supabase migration new add_user_avatar_column
   npx supabase migration new create_notifications_table
   # ❌ Avoid
   npx supabase migration new update
   npx supabase migration new fix
   ```

3. **Test migrations before committing**

   ```bash
   # Always test with a fresh reset
   pnpm db:reset # If using production dump
   ```

4. **Keep seed data up to date**
   - Update `supabase/seed.sql` with representative test data
   - Include edge cases and different user scenarios

5. **Use linting regularly**

   ```bash
   # Check for schema issues before committing
   npx supabase db lint
   ```

### CLI Maintenance

Keep your Supabase CLI updated for the latest features and bug fixes:

```bash
# Check current version
npx supabase --version

# Update if installed via pnpm
pnpm update supabase --save-dev
```

**Recommended:** Update CLI at least once per month or when new features are announced.

### Data Safety

- **Never use `--no-backup` in production** - Only use for local development
- **Always backup before major changes**: `npx supabase db dump`
- **Test destructive migrations locally first** before applying to staging/production

---

## Data Management

### Refreshing Local Data from Production

When you need to sync your local database with production data:

```bash
# 1. Dump fresh production data from local (if synced) or remote
npx supabase db dump --data-only --local > supabase/seed.sql
# OR from remote:
npx supabase db dump --db-url < CONNECTION_STRING > --data-only > supabase/seed.sql

# 2. Reset local database with new data
pnpm db:reset # Handles conflicts between migrations and dump data
```

**Note:** Be careful with production data containing sensitive information. Consider anonymizing data for local development.

### Seeding Custom Data

Edit `supabase/seed.sql` to add custom test data for development:

```sql
-- supabase/seed.sql
-- Add test users
INSERT INTO auth.users (email) VALUES
  ('test@example.com'),
  ('demo@example.com');

-- Add test data for your tables
INSERT INTO everything (title, url, user_id) VALUES
  ('Test Bookmark', 'https://example.com', (SELECT id FROM auth.users WHERE email = 'test@example.com'));
```

---

## Verification Checklist

After initial setup, verify everything is working:

- [ ] Docker containers running (`docker ps`)
- [ ] Can access Supabase Studio at <http://localhost:54323>
- [ ] Can access API Gateway at <http://localhost:54321>
- [ ] Environment variables configured in `.env.local`
- [ ] Can run `npx supabase status` successfully
- [ ] Migrations apply without errors (`pnpm db:reset`)
- [ ] Seed data loads correctly
- [ ] Dev accounts can login to your application
- [ ] Database queries work from your application
- [ ] Auth flow works (signup, login, logout)

**For this project specifically:**

- [ ] Bookmarks load correctly
- [ ] Search functionality works
- [ ] File uploads work (if using Storage)
- [ ] Categories and tags functional
- [ ] Cron jobs exist in database (check with Studio)

---

## Next Steps

Once local development is working, you can:

### Immediate Next Steps

1. **Learn about migrations**: Review existing migrations in `supabase/migrations/`
2. **Explore Studio**: Familiarize yourself with the local Studio interface
3. **Understand the schema**: Review the database structure for this project

### Advanced Topics

- **Dev branch setup**: See [`supabase_migration_guide.md`](./supabase_migration_guide.md) for production deployment workflow
- **Migration best practices**: Check [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- **Local development tips**: Read [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- **CLI deep dive**: Explore [CLI Reference](https://supabase.com/docs/reference/cli/introduction)

### Team Collaboration

- Read the [Production to Local Migration History](./supabase_prod_to_local_migration.md) to understand project history
- Follow the team's workflow for creating and reviewing migrations
- Ask questions in team chat about any unclear processes

---

## Additional Resources

- 📚 [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- 📖 [Local Development Guide](https://supabase.com/docs/guides/local-development)
- 🔧 [Database Migrations Guide](https://supabase.com/docs/guides/deployment/database-migrations)
- 💬 [Supabase GitHub Discussions](https://github.com/orgs/supabase/discussions)
- 🐛 [Report CLI Issues](https://github.com/supabase/cli/issues)

---

**Last Updated**: January 2026
**Document Version**: 2.0
**Based on**: Supabase CLI latest best practices
