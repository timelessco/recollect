/**
 * Enqueue script: push Twitter bookmarks with NULL ogImage onto the
 * AI-enrichment queue so the worker can populate an image for each row.
 *
 * Fetches `type = 'tweet'` rows whose `ogImage` is NULL and pushes them
 * onto the `ai-embeddings` pgmq queue, targeting the AI-enrichment worker
 * (`src/app/api/v2/ai-enrichment/route.ts`).
 *
 * ⚠️ Downstream constraint:
 *   The route's Zod schema requires `ogImage: z.url()`
 *   (`src/app/api/v2/ai-enrichment/schema.ts:64`). Messages with a null
 *   ogImage will fail validation under the current route. Either:
 *     - update the route to accept null ogImage and scrape an image from
 *       the bookmark URL first, OR
 *     - have this script populate ogImage from another source before
 *       enqueueing.
 *   This script ships rows as-is so the failures surface in queue logs.
 *
 * Mirrors the payload shape used by the Twitter edge function worker
 * (`supabase/functions/process-twitter-imports/index.ts:128`).
 *
 * Required message shape (per ai-enrichment/schema.ts):
 *   {
 *     id, url, user_id, type: "tweet",
 *     title, description, ogImage,
 *     meta_data: { favIcon: string, ... }
 *   }
 *
 *   - `meta_data.favIcon` is required by the Zod schema — we default to "".
 *
 * Storage backend selection mirrors `src/utils/storageClient.ts:13`:
 *   - Local dev (NODE_ENV != "production" and NEXT_PUBLIC_DEV_SUPABASE_URL set):
 *       local Supabase
 *   - Otherwise: dev/prod Supabase
 *
 * Self-contained (no `@/` alias imports) so it runs under `tsx` without
 * tsconfig-paths registration.
 *
 * Usage:
 *   # Global overview: every user's null-ogImage tweet count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --all
 *
 *   # Stats + sample for one user (no enqueue)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --dry-run <uuid>
 *
 *   # Actually push every eligible row onto the ai-embeddings queue
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
const AI_EMBEDDINGS_QUEUE = "ai-embeddings";
const PAGE_SIZE = 1000;
const SAMPLE_SIZE = 10;

// CLI mode parsing.
type CliMode =
  | { kind: "all" }
  | { kind: "dry-run"; userId: string }
  | { kind: "run"; userId: string };

function printUsageAndExit(message: string): never {
  console.error(`[enqueue] ${message}`);
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
    console.error(`[enqueue] Missing required env var: ${name}`);
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

type MetaData = Record<string, unknown> | null;

interface BookmarkRow {
  description: null | string;
  id: number;
  meta_data: MetaData;
  ogImage: null | string;
  title: null | string;
  url: null | string;
  user_id: string;
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

// Counts tweets whose ogImage is NULL — these are the rows we want the
// enrichment worker to populate an image for.
async function countEnqueueableForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", BOOKMARK_TYPE)
    .is("trash", null)
    .is("ogImage", null);

  if (error) {
    throw new Error(`Enqueueable count failed for ${userId}: ${error.message}`);
  }

  return count ?? 0;
}

// Fetches one page of enqueueable rows, with all fields needed for the queue
// message payload. The caller paginates.
async function fetchEnqueueablePage(
  userId: string,
  offset: number,
  limit: number,
): Promise<BookmarkRow[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, url, user_id, title, description, ogImage, meta_data")
    .eq("user_id", userId)
    .eq("type", BOOKMARK_TYPE)
    .is("trash", null)
    .is("ogImage", null)
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Enqueueable fetch failed at offset ${offset}: ${error.message}`);
  }

  return (data ?? []) as BookmarkRow[];
}

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

// Pushes one row onto the `ai-embeddings` pgmq queue using the exact payload
// shape expected by `AiEnrichmentInputSchema`. Matches the Twitter edge
// function worker at supabase/functions/process-twitter-imports/index.ts:128.
async function enqueueForEnrichment(row: BookmarkRow): Promise<void> {
  const existingMetaData = row.meta_data ?? {};

  // favIcon is required by the Zod schema; default to "" if missing so the
  // enrichment route doesn't reject the message.
  const metaDataWithFavicon = {
    favIcon: "",
    ...existingMetaData,
  };

  const { error } = await supabase.schema("pgmq_public").rpc("send", {
    message: {
      description: row.description ?? "",
      id: row.id,
      meta_data: metaDataWithFavicon,
      ogImage: row.ogImage,
      title: row.title ?? "",
      type: BOOKMARK_TYPE,
      url: row.url ?? "",
      user_id: row.user_id,
    },
    queue_name: AI_EMBEDDINGS_QUEUE,
    sleep_seconds: 0,
  });

  if (error) {
    throw new Error(`pgmq send failed for id=${row.id}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function runGlobalStats(): Promise<void> {
  console.log("[enqueue] [GLOBAL STATS]");
  console.log(`[enqueue] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);

  const profiles = await fetchAllProfiles();
  console.log(`[enqueue] Fetched ${profiles.length} profiles`);

  const counts = await Promise.all(
    profiles.map(async (profile) => {
      const [total, enqueueable] = await Promise.all([
        countTweetsForUser(profile.id),
        countEnqueueableForUser(profile.id),
      ]);
      return { enqueueable, profile, total };
    }),
  );

  // Only show users with at least one enqueueable tweet, highest first.
  const withEnqueueable = counts
    .filter((entry) => entry.enqueueable > 0)
    .toSorted((a, b) => b.enqueueable - a.enqueueable);

  const grandTotalTweets = counts.reduce((sum, entry) => sum + entry.total, 0);
  const grandEnqueueable = counts.reduce((sum, entry) => sum + entry.enqueueable, 0);

  console.log("");
  console.log("=== Tweets with NULL ogImage per user ===");
  console.log(
    `${"total".padStart(8)}  ${"to_queue".padStart(8)}  user_id                               ${"user_name".padEnd(24)}  email`,
  );
  console.log(
    `${"-----".padStart(8)}  ${"--------".padStart(8)}  ------------------------------------  ${"---------".padEnd(24)}  -----`,
  );
  for (const entry of withEnqueueable) {
    const totalStr = String(entry.total).padStart(8);
    const enqueueableStr = String(entry.enqueueable).padStart(8);
    const userName = (entry.profile.user_name ?? entry.profile.display_name ?? "<none>").padEnd(24);
    const email = entry.profile.email ?? "<none>";
    console.log(`${totalStr}  ${enqueueableStr}  ${entry.profile.id}  ${userName}  ${email}`);
  }
  console.log("");
  console.log(`Users with NULL-ogImage tweets: ${withEnqueueable.length}`);
  console.log(`Total tweets across all users:  ${grandTotalTweets}`);
  console.log(`Total enqueueable (NULL ogImage): ${grandEnqueueable}`);
}

async function runUserStats(userId: string, shouldRun: boolean): Promise<void> {
  const modeLabel = shouldRun ? " [ENQUEUING]" : " [DRY-RUN]";
  console.log(`[enqueue]${modeLabel} Starting for user ${userId}`);
  console.log(`[enqueue] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);
  console.log(`[enqueue] Queue:  ${AI_EMBEDDINGS_QUEUE}`);

  const [totalTweets, enqueueableCount] = await Promise.all([
    countTweetsForUser(userId),
    countEnqueueableForUser(userId),
  ]);

  console.log("");
  console.log("=== Stats ===");
  console.log(`Total tweet bookmarks:            ${totalTweets}`);
  console.log(`Enqueueable (NULL ogImage):       ${enqueueableCount}`);

  if (enqueueableCount === 0) {
    console.log("");
    console.log("[enqueue] No enqueueable tweets. Exiting.");
    return;
  }

  if (!shouldRun) {
    // Dry-run: show a small sample of what would be pushed, then exit.
    const sample = await fetchEnqueueablePage(userId, 0, SAMPLE_SIZE);
    console.log("");
    console.log(`=== Sample (first ${sample.length}) ===`);
    console.log(`${"id".padStart(10)}  ${"ogImage".padEnd(60)}  url`);
    console.log(`${"--".padStart(10)}  ${"-------".padEnd(60)}  ---`);
    for (const row of sample) {
      const idStr = String(row.id).padStart(10);
      const ogImage = (row.ogImage ?? "<null>").padEnd(60);
      const url = row.url ?? "<null>";
      console.log(`${idStr}  ${ogImage}  ${url}`);
    }
    console.log("");
    console.log("To actually enqueue every eligible row:");
    console.log(
      `  SKIP_ENV_VALIDATION=1 npx tsx scripts/find-tweets-null-og-images.ts --run ${userId}`,
    );
    return;
  }

  // Run mode: stream pages, enqueueing each row. Stream rather than load all
  // into memory so huge users don't blow the heap.
  console.log("");
  console.log(`[enqueue] Pushing ${enqueueableCount} rows onto ${AI_EMBEDDINGS_QUEUE}...`);

  let succeeded = 0;
  let failed = 0;
  const failures: { error: string; id: number }[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchEnqueueablePage(userId, offset, PAGE_SIZE);
    if (page.length === 0) {
      break;
    }

    for (const row of page) {
      try {
        await enqueueForEnrichment(row);
        succeeded += 1;
        if (succeeded % 50 === 0) {
          console.log(`[enqueue] Progress: ${succeeded}/${enqueueableCount}`);
        }
      } catch (error: unknown) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ error: message, id: row.id });
        console.error(`[enqueue] FAILED id=${row.id} error=${message}`);
      }
    }

    if (page.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  console.log("");
  console.log("=== Enqueue Summary ===");
  console.log(`Eligible:   ${enqueueableCount}`);
  console.log(`Succeeded:  ${succeeded}`);
  console.log(`Failed:     ${failed}`);

  if (failures.length > 0) {
    console.log("");
    console.log("=== Failures ===");
    for (const failure of failures) {
      console.log(`  id=${failure.id}  error=${failure.error}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function runScript(): Promise<void> {
  if (cliMode.kind === "all") {
    await runGlobalStats();
    return;
  }

  await runUserStats(cliMode.userId, cliMode.kind === "run");
}

try {
  await runScript();
} catch (error: unknown) {
  console.error("[enqueue] Fatal error:", error);
  process.exit(1);
}
