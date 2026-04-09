/**
 * Scripts index — commands to run the one-off operational scripts.
 *
 * =====================================================================
 * 1. backfill-twitter-og-images.ts
 * =====================================================================
 *
 *   # Global stats — every user's tweet count and how many need backfill
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/backfill-twitter-og-images.ts --all
 *
 *   # Stats for one user (no downloads, no uploads, no DB writes)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/backfill-twitter-og-images.ts --dry-run <user-uuid>
 *
 *   # Download + upload + DB update for every eligible row
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/backfill-twitter-og-images.ts --run <user-uuid>
 *
 * =====================================================================
 * 2. find-tweets-null-og-images.ts
 * =====================================================================
 *
 *   # Global stats — every user with NULL-ogImage tweets
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --all
 *
 *   # Stats + sample for one user (no enqueue)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --dry-run <user-uuid>
 *
 *   # Actually push every NULL-ogImage tweet onto the ai-embeddings queue
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --run <user-uuid>
 *
 * =====================================================================
 * 3. fix-category-order.ts
 * =====================================================================
 *
 *   # List every user whose profiles.category_order length does not match
 *   # their actual category count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/fix-category-order.ts --all
 *
 *   # Overwrite one user's category_order with their real category IDs
 *   # (preserves existing ordering, drops stale IDs, appends missing ones)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/fix-category-order.ts --run <user-uuid>
 *
 * =====================================================================
 * 4. seed-twitter-imports.ts
 * =====================================================================
 *
 * Seeds test Twitter bookmarks + enqueues them onto ai-embeddings. Target
 * user resolved from `CURRENT_USER_ID` env var first, `--user-id` flag as
 * fallback. Default 5 fixtures per run; override with `--count`.
 *
 *   # Preview (uses CURRENT_USER_ID from .env)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-twitter-imports.ts --dry-run
 *
 *   # Seed 5 twitter fixtures + enqueue to ai-embeddings
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-twitter-imports.ts
 *
 *   # Explicit user override + custom count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-twitter-imports.ts --user-id <user-uuid> --count 3
 *
 * =====================================================================
 * 5. seed-instagram-imports.ts
 * =====================================================================
 *
 * Seeds test Instagram bookmarks + enqueues them onto ai-embeddings.
 * Default 3 fixtures per run.
 *
 *   # Preview (uses CURRENT_USER_ID from .env)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-instagram-imports.ts --dry-run
 *
 *   # Seed 3 instagram fixtures + enqueue to ai-embeddings
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-instagram-imports.ts
 *
 *   # Explicit user override
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-instagram-imports.ts --user-id <user-uuid>
 *
 * =====================================================================
 * 6. seed-raindrop-imports.ts
 * =====================================================================
 *
 * Seeds test Raindrop bookmarks + enqueues them onto ai-embeddings.
 * Default 5 fixtures per run.
 *
 *   # Preview (uses CURRENT_USER_ID from .env)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-raindrop-imports.ts --dry-run
 *
 *   # Seed 5 raindrop fixtures + enqueue to ai-embeddings
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-raindrop-imports.ts
 *
 *   # Explicit user override + custom count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-raindrop-imports.ts --user-id <user-uuid> --count 3
 *
 * =====================================================================
 * 7. seed-chrome-imports.ts
 * =====================================================================
 *
 * Seeds test Chrome bookmarks + enqueues them onto ai-embeddings.
 * Default 5 fixtures per run.
 *
 *   # Preview (uses CURRENT_USER_ID from .env)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-chrome-imports.ts --dry-run
 *
 *   # Seed 5 chrome fixtures + enqueue to ai-embeddings
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-chrome-imports.ts
 *
 *   # Explicit user override + custom count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-chrome-imports.ts --user-id <user-uuid> --count 3
 */

// Doc-only module — see top-of-file JSDoc for the full command reference.
export const SCRIPT_INDEX = "scripts/document.ts" as const;
