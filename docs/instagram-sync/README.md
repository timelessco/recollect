# Instagram Sync Feature

Import Instagram saved posts into Recollect bookmarks using a queue-based processing system.

## Architecture

```text
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐     ┌──────────────┐
│   REST API      │     │   PGMQ Queue     │     │  Edge Function    │     │   Database   │
│ /api/instagram/ │ ──► │ instagram_     │ ──► │ process-instagram │ ──► │  everything  │
│     sync        │     │    imports       │     │     -imports      │     │  categories  │
└─────────────────┘     └──────────────────┘     └───────────────────┘     └──────────────┘
        │                       │                         │                       │
        │                       │                         │                       │
   Validates &            Stores with              Calls RPC for           Bookmark +
   queues up to           retry logic              atomic processing       Category +
   500 bookmarks          (visibility 30s)         (batch of 5)            Junction
```

## Components

| Component     | Path                                                       | Purpose                                        |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| API Endpoint  | `src/app/api/instagram/sync/route.ts`                      | Validates & queues up to 500 bookmarks         |
| Status API    | `src/app/api/instagram/sync/status/route.ts`               | Returns pending count and archived messages    |
| Retry API     | `src/app/api/instagram/sync/retry/route.ts`                | Retry specific msg_ids or all archived imports |
| PGMQ Queue    | `instagram_imports`                                        | Async processing with built-in retry           |
| Edge Function | `supabase/functions/process-instagram-imports/`            | Worker: reads 5 msgs, 30s visibility timeout   |
| RPC Function  | `process_instagram_bookmark`                               | Atomic: creates category + bookmark + junction |
| RPC Function  | `invoke_instagram_worker`                                  | Cron wrapper: validates vault, invokes worker  |
| RPC Function  | `get_instagram_worker_failures`                            | Monitor HTTP failures from cron invocations    |
| RPC Function  | `retry_all_instagram_imports`                              | User-level retry all archived imports          |
| Migration     | `supabase/migrations/20260107110628_instagram_imports.sql` | Creates queue, RPC, RLS policies               |

## Design Decisions

| Decision                       | Rationale                                                       |
| ------------------------------ | --------------------------------------------------------------- |
| No deduplication               | Same URL in different collections is valid (160+ exist in prod) |
| Simple INSERT                  | Not upsert - re-import creates new bookmark                     |
| Empty collections → category 0 | Junction model requires a category (uncategorized)              |
| Category slug pattern          | `{name}-instagram-{8chars}` for uniqueness                      |
| Max 3 retries                  | After `read_ct > 3`, message archived + Sentry alert            |

## Local Development

### Prerequisites

```bash
pnpm db:start # Start Supabase + sync vault secret
pnpm db:reset # Reset database + sync vault secret
pnpm dev      # Dev server (already running)
```

> **Note**: The `db:start` and `db:reset` scripts automatically sync the vault secret with the edge runtime. This is required because Supabase CLI v2.x regenerates keys on each start.

### E2E Testing (Manual)

**Using REST Client files in `api-tests/`:**

1. **Get auth token**: Login at `localhost:3000` → visit `/api/dev/session` → copy `access_token`
2. **Update** `api-tests/.env` with `USER_TOKEN`
3. **Queue bookmark**: Run request in `api-tests/instagram-sync.http`
4. **Verify queue**:

   ```bash
   LOCAL_DB="postgresql://postgres:postgres@localhost:54322/postgres"
   psql "$LOCAL_DB" -c "SELECT msg_id, message->>'url' FROM pgmq_public.read('instagram_imports', 0, 5);"
   ```

5. **Start Edge Function**: `npx supabase functions serve process-instagram-imports`
6. **Process queue**: Run request in `api-tests/edge-function-worker.http`
7. **Verify results**:

   ```bash
   psql "$LOCAL_DB" -c "SELECT id, url, title FROM everything WHERE type = 'instagram' ORDER BY id DESC LIMIT 3;"
   psql "$LOCAL_DB" -c "SELECT id, category_name FROM categories WHERE category_slug LIKE '%-instagram-%' ORDER BY id DESC LIMIT 3;"
   ```

### pg_cron (Auto-Configured)

pg_cron is **automatically set up** when you run `pnpm db:reset`. The job polls the queue every 10 seconds using the `invoke_instagram_worker()` wrapper function.

For details and troubleshooting, see [CRON-SETUP.md](./CRON-SETUP.md).

## Status & Retry API

### Check Queue Status

```http
GET /api/instagram/sync/status
Authorization: Bearer <user_token>

# Returns: { pending: N, archived: N, archives: [...] }
```

### Retry Archived Imports

```http
# Retry specific messages
POST /api/instagram/sync/retry
Authorization: Bearer <user_token>
{ "msg_ids": [1, 2, 3] }

# Retry ALL archived imports
POST /api/instagram/sync/retry
Authorization: Bearer <user_token>
{ "all": true }

# Returns: { requeued: N }
```

See `api-tests/instagram-sync-retry.http` for more examples.

## Production Deployment

Migrations are applied automatically when merging to dev/main branches.

```bash
# Deploy Edge Function
npx supabase functions deploy process-instagram-imports --project-ref <project-ref>
```

For pg_cron setup and verification steps, see [CRON-SETUP.md](./CRON-SETUP.md).

## Monitoring

```sql
-- Queue metrics
SELECT * FROM pgmq.metrics('instagram_imports');

-- Archived messages (all users)
SELECT * FROM pgmq.a_instagram_imports ORDER BY archived_at DESC LIMIT 10;

-- Recent Instagram bookmarks
SELECT id, url, title, created_at FROM everything
WHERE type = 'instagram' ORDER BY id DESC LIMIT 10;

-- HTTP failures from cron invocations (last 5 minutes)
SELECT * FROM get_instagram_worker_failures(5);
```

### Admin Functions (service_role only)

```sql
-- View all archived imports across users
SELECT * FROM admin_get_instagram_archives();

-- Retry specific archived messages by ID
SELECT admin_retry_instagram_import(ARRAY[1, 2, 3]);

-- Retry ALL archived imports across all users
SELECT admin_retry_all_instagram_archives();
```

## Troubleshooting

### Edge Function not processing

1. Check function is running: `curl http://localhost:54321/functions/v1/process-instagram-imports`
2. Check queue has messages: `SELECT * FROM pgmq_public.read('instagram_imports', 0, 5);`
3. Check function logs in terminal

### Queue messages not being deleted

- RPC might be failing - check for errors in Edge Function response
- Verify `process_instagram_bookmark` function exists: `\df process_instagram_bookmark`

### Category not created

- Check `saved_collection_names` is in `meta_data` field
- Verify it's an array of strings, not null

## Files

| File                        | Purpose                               |
| --------------------------- | ------------------------------------- |
| `README.md`                 | This documentation                    |
| `CRON-SETUP.md`             | pg_cron job setup and troubleshooting |
| `setup-production-cron.sql` | Production pg_cron setup + rollback   |
