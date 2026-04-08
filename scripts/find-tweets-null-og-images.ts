/**
 * Audit script: find Twitter bookmarks whose `ogImage` is NULL.
 *
 * Read-only — never mutates anything. Mirrors the CLI shape of
 * `scripts/backfill-twitter-og-images.ts` so the two scripts feel the same.
 *
 *   --all                : global stats across every user
 *   --dry-run <uuid>     : counts + sample rows for one user
 *   --run <uuid>         : full row dump for one user (id, url, title, inserted_at)
 *
 * "run" here does NOT mutate — there is nothing to backfill from a NULL value.
 * It exists so the CLI mirrors the backfill script and can be piped to a file
 * for downstream processing (e.g. `... --run <uuid> > tweets.tsv`).
 *
 * Storage backend selection mirrors `src/utils/storageClient.ts:13`:
 *   - Local dev (NODE_ENV != "production" and NEXT_PUBLIC_DEV_SUPABASE_URL set):
 *       local Supabase
 *   - Otherwise: dev/prod Supabase
 *
 * This script is intentionally self-contained (no `@/` alias imports) so that
 * it can run under `tsx` without tsconfig-paths registration.
 *
 * Usage:
 *   # Global overview: every user's null-ogImage tweet count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --all
 *
 *   # Stats + sample for one user
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --dry-run <uuid>
 *
 *   # Full row dump for one user
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --run <uuid>
 */

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TABLE_NAME = "everything";
const PROFILES_TABLE_NAME = "profiles";
const BOOKMARK_TYPE = "tweet";
const PAGE_SIZE = 1000;
const SAMPLE_SIZE = 10;

// CLI mode parsing.
//   --all                : global stats across every user
//   --dry-run <uuid>     : counts + sample rows for one user
//   --run <uuid>         : full row dump for one user
type CliMode =
  | { kind: "all" }
  | { kind: "dry-run"; userId: string }
  | { kind: "run"; userId: string };

function printUsageAndExit(message: string): never {
  console.error(`[null-og] ${message}`);
  console.error("");
  console.error("Usage:");
  console.error("  npx tsx scripts/find-tweets-null-og-images.ts --all");
  console.error("  npx tsx scripts/find-tweets-null-og-images.ts --dry-run <uuid>");
  console.error("  npx tsx scripts/find-tweets-null-og-images.ts --run <uuid>");
  process.exit(1);
}

function parseCliMode(): CliMode {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    return { kind: "all" };
  }

  const dryRunIdx = args.indexOf("--dry-run");
  if (dryRunIdx !== -1) {
    const userId = args[dryRunIdx + 1];
    if (!userId || userId.startsWith("--")) {
      printUsageAndExit("--dry-run requires a <uuid>. Use --all for global stats.");
    }
    return { kind: "dry-run", userId };
  }

  const runIdx = args.indexOf("--run");
  if (runIdx !== -1) {
    const userId = args[runIdx + 1];
    if (!userId || userId.startsWith("--")) {
      printUsageAndExit("--run requires a <uuid>. Use --all for global stats.");
    }
    return { kind: "run", userId };
  }

  return printUsageAndExit("No mode specified.");
}

const cliMode = parseCliMode();

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const isProductionEnvironment = process.env.NODE_ENV === "production";
const hasDevSupabase = Boolean(process.env.NEXT_PUBLIC_DEV_SUPABASE_URL);
const isLocal = !isProductionEnvironment && hasDevSupabase;

const supabaseUrl = isLocal
  ? process.env.NEXT_PUBLIC_DEV_SUPABASE_URL
  : process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceKey = isLocal
  ? process.env.DEV_SUPABASE_SERVICE_KEY
  : process.env.SUPABASE_SERVICE_KEY;

function assertEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`[null-og] Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const SUPABASE_URL = assertEnv(
  isLocal ? "NEXT_PUBLIC_DEV_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL",
  supabaseUrl,
);
const SUPABASE_SERVICE_KEY = assertEnv(
  isLocal ? "DEV_SUPABASE_SERVICE_KEY" : "SUPABASE_SERVICE_KEY",
  supabaseServiceKey,
);

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookmarkRow {
  id: number;
  inserted_at: null | string;
  title: null | string;
  url: null | string;
}

interface ProfileRow {
  display_name: null | string;
  email: null | string;
  id: string;
  user_name: null | string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function fetchAllProfiles(): Promise<ProfileRow[]> {
  const rows: ProfileRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(PROFILES_TABLE_NAME)
      .select("id, user_name, display_name, email")
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Profiles fetch failed at offset ${offset}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...(data as ProfileRow[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

async function countTweetsForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", BOOKMARK_TYPE)
    .is("trash", null);

  if (error) {
    throw new Error(`Tweet count failed for ${userId}: ${error.message}`);
  }

  return count ?? 0;
}

async function countNullOgImageForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", BOOKMARK_TYPE)
    .is("trash", null)
    .is("ogImage", null);

  if (error) {
    throw new Error(`Null ogImage count failed for ${userId}: ${error.message}`);
  }

  return count ?? 0;
}

async function fetchTweetsWithNullOgImage(userId: string, limit?: number): Promise<BookmarkRow[]> {
  const rows: BookmarkRow[] = [];
  let offset = 0;

  while (true) {
    const pageEnd = offset + PAGE_SIZE - 1;
    const upperBound = limit === undefined ? pageEnd : Math.min(pageEnd, limit - 1);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, url, title, inserted_at")
      .eq("user_id", userId)
      .eq("type", BOOKMARK_TYPE)
      .is("trash", null)
      .is("ogImage", null)
      .order("id", { ascending: true })
      .range(offset, upperBound);

    if (error) {
      throw new Error(`Null ogImage fetch failed at offset ${offset}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...(data as BookmarkRow[]));

    if (limit !== undefined && rows.length >= limit) {
      break;
    }

    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function runGlobalStats(): Promise<void> {
  console.log("[null-og] [GLOBAL STATS]");
  console.log(`[null-og] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);

  const profiles = await fetchAllProfiles();
  console.log(`[null-og] Fetched ${profiles.length} profiles`);

  const counts = await Promise.all(
    profiles.map(async (profile) => {
      const [total, nullOg] = await Promise.all([
        countTweetsForUser(profile.id),
        countNullOgImageForUser(profile.id),
      ]);
      return { nullOg, profile, total };
    }),
  );

  // Only show users with at least one null-ogImage tweet, highest first.
  const withNullOg = counts
    .filter((entry) => entry.nullOg > 0)
    .toSorted((a, b) => b.nullOg - a.nullOg);

  const grandTotalTweets = counts.reduce((sum, entry) => sum + entry.total, 0);
  const grandNullOg = counts.reduce((sum, entry) => sum + entry.nullOg, 0);

  console.log("");
  console.log("=== Tweets with NULL ogImage per user ===");
  console.log(
    `${"total".padStart(8)}  ${"null_og".padStart(8)}  user_id                               ${"user_name".padEnd(24)}  email`,
  );
  console.log(
    `${"-----".padStart(8)}  ${"-------".padStart(8)}  ------------------------------------  ${"---------".padEnd(24)}  -----`,
  );
  for (const entry of withNullOg) {
    const totalStr = String(entry.total).padStart(8);
    const nullOgStr = String(entry.nullOg).padStart(8);
    const userName = (entry.profile.user_name ?? entry.profile.display_name ?? "<none>").padEnd(24);
    const email = entry.profile.email ?? "<none>";
    console.log(`${totalStr}  ${nullOgStr}  ${entry.profile.id}  ${userName}  ${email}`);
  }
  console.log("");
  console.log(`Users with null-ogImage tweets: ${withNullOg.length}`);
  console.log(`Total tweets across all users: ${grandTotalTweets}`);
  console.log(`Total tweets with NULL ogImage: ${grandNullOg}`);
}

async function runUserStats(userId: string, full: boolean): Promise<void> {
  const modeLabel = full ? " [FULL DUMP]" : " [DRY-RUN]";
  console.log(`[null-og]${modeLabel} Starting for user ${userId}`);
  console.log(`[null-og] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);

  const [totalTweets, nullOgCount] = await Promise.all([
    countTweetsForUser(userId),
    countNullOgImageForUser(userId),
  ]);

  console.log("");
  console.log("=== Stats ===");
  console.log(`Total tweet bookmarks:           ${totalTweets}`);
  console.log(`Tweets with NULL ogImage:        ${nullOgCount}`);

  if (nullOgCount === 0) {
    console.log("");
    console.log("[null-og] No tweets with NULL ogImage. Exiting.");
    return;
  }

  const rows = await fetchTweetsWithNullOgImage(userId, full ? undefined : SAMPLE_SIZE);

  console.log("");
  console.log(full ? "=== All rows ===" : `=== Sample (first ${rows.length}) ===`);
  console.log(`${"id".padStart(10)}  ${"inserted_at".padEnd(25)}  url`);
  console.log(`${"--".padStart(10)}  ${"-----------".padEnd(25)}  ---`);
  for (const row of rows) {
    const idStr = String(row.id).padStart(10);
    const insertedAt = (row.inserted_at ?? "<null>").padEnd(25);
    const url = row.url ?? "<null>";
    console.log(`${idStr}  ${insertedAt}  ${url}`);
  }

  if (!full) {
    console.log("");
    console.log("To dump every row for this user:");
    console.log(
      `  SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --run ${userId}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function runAudit(): Promise<void> {
  if (cliMode.kind === "all") {
    await runGlobalStats();
    return;
  }

  await runUserStats(cliMode.userId, cliMode.kind === "run");
}

try {
  await runAudit();
} catch (error: unknown) {
  console.error("[null-og] Fatal error:", error);
  process.exit(1);
}
