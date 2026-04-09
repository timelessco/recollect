/**
 * Seed script: insert test Twitter bookmarks for a target user and push them
 * onto the `ai-embeddings` pgmq queue so the AI-enrichment pipeline runs end
 * to end.
 *
 * Fixture rows are hardcoded snapshots of real `type = 'tweet'` rows pulled
 * from the local Supabase once during implementation, so the shapes match the
 * Twitter import path exactly (title, url, description, ogImage, meta_data
 * with favIcon + twitter_avatar_url + optional video_url, and sort_index).
 *
 * Each fixture is inserted as a NEW row in `public.everything` owned by the
 * target user (Postgres assigns a fresh `id`), and then enqueued onto
 * `ai-embeddings` using the exact message shape the Twitter edge-function
 * worker produces (`supabase/functions/process-twitter-imports/index.ts:128`).
 *
 * Environment selection mirrors `src/utils/storageClient.ts:13`:
 *   - Local dev (NODE_ENV != "production" and NEXT_PUBLIC_DEV_SUPABASE_URL set):
 *       local Supabase
 *   - Otherwise: dev/prod Supabase
 *
 * Self-contained (no `@/` alias imports) so it runs under `tsx` without
 * tsconfig-paths registration.
 *
 * Target user resolution (in order):
 *   1. `CURRENT_USER_ID` env var (add to .env for zero-friction local runs)
 *   2. `--user-id <uuid>` CLI flag
 *   3. Error if neither is set
 *
 * Usage:
 *   # With CURRENT_USER_ID in .env (no flag needed)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-twitter-imports.ts --dry-run
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-twitter-imports.ts
 *
 *   # Explicit user via CLI (fallback / override)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-twitter-imports.ts --user-id <uuid>
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-twitter-imports.ts --user-id <uuid> --count 3
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
const DEFAULT_COUNT = 5;

// ---------------------------------------------------------------------------
// Fixture rows (real `type='tweet'` data snapshotted from local Supabase)
// ---------------------------------------------------------------------------

interface TwitterFixture {
  description: string;
  meta_data: Record<string, unknown>;
  ogImage: string;
  sort_index: string;
  title: string;
  url: string;
}

// cspell:disable — fixture rows contain real author names and handles
const TWITTER_FIXTURES: TwitterFixture[] = [
  {
    title: "BenIt Pro",
    url: "https://x.com/BennettBuhner/status/1964599188479758708",
    description: "Nobody:\n\nSamsung: https://t.co/vwqbE6ipz1",
    ogImage: "https://pbs.twimg.com/media/G0Ood82WgAA71dt.jpg",
    sort_index: "1842763936173781853",
    meta_data: {
      favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
      twitter_avatar_url:
        "https://pbs.twimg.com/profile_images/1900365953461796864/kiSBqOMf_normal.jpg",
    },
  },
  {
    title: "Restoring Your Faith in Humanity",
    url: "https://x.com/HumanityChad/status/1964812868056228075",
    description:
      "Mama Elephant thanks stranger for giving its kid some water https://t.co/2iYpFyvHxP",
    ogImage:
      "https://pbs.twimg.com/amplify_video_thumb/1964812782097817600/img/rNp8tnb2Y0le46V3.jpg",
    sort_index: "1842767274491316410",
    meta_data: {
      favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
      twitter_avatar_url:
        "https://pbs.twimg.com/profile_images/1962345857640247297/3j4thhf4_normal.jpg",
      video_url:
        "https://video.twimg.com/amplify_video/1964812782097817600/vid/avc1/480x640/pr4fnz1LNaoRdYJ9.mp4?tag=21",
    },
  },
  {
    title: "HOW THINGS WORK",
    url: "https://x.com/HowThingsWork_/status/1964987062882586837",
    description: "Two bullets colliding https://t.co/qtmxLEuv5C",
    ogImage:
      "https://pbs.twimg.com/amplify_video_thumb/1964986884662181889/img/RokxYRO_MLpjhyFI.jpg",
    sort_index: "1842768594494332264",
    meta_data: {
      favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
      twitter_avatar_url:
        "https://pbs.twimg.com/profile_images/1592626494546796545/YxyPborr_normal.jpg",
      video_url:
        "https://video.twimg.com/amplify_video/1964986884662181889/vid/avc1/720x578/l3apjhYR3L4aFHY8.mp4?tag=21",
    },
  },
  {
    title: "Elon Musk",
    url: "https://x.com/elonmusk/status/1965131580965618117",
    description:
      "Now do you understand how much the legacy (fka mainstream) media lies simply by ignoring a subject?\n\nChoice of narrative is their primary form of deception. https://t.co/OAVGo6TED4",
    ogImage: "https://pbs.twimg.com/media/G0WMwetXQAAKis4.jpg",
    sort_index: "1842779012924753156",
    meta_data: {
      favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
      twitter_avatar_url:
        "https://pbs.twimg.com/profile_images/2035314704307081216/71U1ftM3_normal.jpg",
    },
  },
  {
    title: "Rishabh Joshi",
    url: "https://x.com/rishabhhdesigns/status/1964664372070166810",
    description:
      "I've seen a TON of websites\n\nThere's no better CTA button than this https://t.co/6BOZWMjAeN",
    ogImage:
      "https://pbs.twimg.com/amplify_video_thumb/1964664308438028288/img/udT_uXfqsfpg5B4w.jpg",
    sort_index: "1842782123788408707",
    meta_data: {
      favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
      twitter_avatar_url:
        "https://pbs.twimg.com/profile_images/1950898316847489025/fjN9Ff86_normal.jpg",
      video_url:
        "https://video.twimg.com/amplify_video/1964664308438028288/vid/avc1/1080x1080/3hH87jivdPXTTeX-.mp4?tag=21",
    },
  },
];
// cspell:enable

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface CliOptions {
  count: number;
  dryRun: boolean;
  userId: null | string;
}

function printUsageAndExit(message: string): never {
  console.error(`[seed-twitter] ${message}`);
  console.error("");
  console.error("Usage:");
  console.error(
    "  npx tsx scripts/seed-twitter-imports.ts [--user-id <uuid>] [--count <n>] [--dry-run]",
  );
  console.error("");
  console.error("  Target user resolution:");
  console.error("    1. CURRENT_USER_ID env var (e.g., in .env)");
  console.error("    2. --user-id <uuid> CLI flag");
  process.exit(1);
}

function parseCli(): CliOptions {
  const args = process.argv.slice(2);

  let userId: null | string = null;
  const userIdIdx = args.indexOf("--user-id");
  if (userIdIdx !== -1) {
    const value = args[userIdIdx + 1];
    if (!value || value.startsWith("--")) {
      printUsageAndExit("--user-id requires a <uuid> value");
    }
    userId = value;
  }

  let count = DEFAULT_COUNT;
  const countIdx = args.indexOf("--count");
  if (countIdx !== -1) {
    const rawCount = args[countIdx + 1];
    const parsed = Number.parseInt(rawCount ?? "", 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      printUsageAndExit("--count requires a positive integer");
    }
    count = parsed;
  }

  const dryRun = args.includes("--dry-run");

  return { count, dryRun, userId };
}

const cliOptions = parseCli();

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
    console.error(`[seed-twitter] Missing required env var: ${name}`);
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
// Helpers
// ---------------------------------------------------------------------------

interface InsertedRow {
  description: string;
  id: number;
  meta_data: Record<string, unknown>;
  ogImage: string;
  title: string;
  url: string;
  user_id: string;
}

interface ResolvedUser {
  source: "cli" | "env";
  userId: string;
}

function resolveUserIdSource(cliUserId: null | string): ResolvedUser {
  const envUserId = process.env.CURRENT_USER_ID?.trim();
  if (envUserId) {
    return { source: "env", userId: envUserId };
  }
  if (cliUserId) {
    return { source: "cli", userId: cliUserId };
  }
  printUsageAndExit("No target user. Set CURRENT_USER_ID in .env or pass --user-id <uuid>.");
}

async function validateUserExists(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from(PROFILES_TABLE_NAME)
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Profile lookup failed: ${error.message}`);
  }
  if (!data) {
    throw new Error(`No profile found for user_id=${userId}`);
  }
}

async function insertFixture(fixture: TwitterFixture, userId: string): Promise<InsertedRow> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      description: fixture.description,
      meta_data: fixture.meta_data,
      ogImage: fixture.ogImage,
      sort_index: fixture.sort_index,
      title: fixture.title,
      type: BOOKMARK_TYPE,
      url: fixture.url,
      user_id: userId,
    })
    .select("id, url, user_id, title, description, ogImage, meta_data")
    .single();

  if (error || !data) {
    throw new Error(`Insert failed for ${fixture.url}: ${error?.message ?? "no row returned"}`);
  }

  return data as InsertedRow;
}

async function enqueueForEnrichment(row: InsertedRow): Promise<void> {
  const { error } = await supabase.schema("pgmq_public").rpc("send", {
    message: {
      description: row.description ?? "",
      id: row.id,
      meta_data: row.meta_data,
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
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { count, dryRun, userId: cliUserId } = cliOptions;
  const modeLabel = dryRun ? " [DRY-RUN]" : "";

  console.log(`[seed-twitter]${modeLabel} Starting`);
  console.log(`[seed-twitter] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);
  console.log(`[seed-twitter] Queue:  ${AI_EMBEDDINGS_QUEUE}`);

  const { source, userId } = resolveUserIdSource(cliUserId);
  console.log(
    `[seed-twitter] User:   ${userId} (from ${source === "env" ? "CURRENT_USER_ID env var" : "--user-id flag"})`,
  );

  await validateUserExists(userId);

  const slice = TWITTER_FIXTURES.slice(0, count);
  if (slice.length === 0) {
    console.log("[seed-twitter] No fixtures to seed (count=0). Exiting.");
    return;
  }
  if (slice.length < count) {
    console.warn(
      `[seed-twitter] Requested ${count} but only ${TWITTER_FIXTURES.length} fixtures are available. Seeding ${slice.length}.`,
    );
  }

  if (dryRun) {
    console.log("");
    console.log(`=== Would insert ${slice.length} twitter fixtures ===`);
    for (const [index, fixture] of slice.entries()) {
      console.log(`  [${index + 1}] ${fixture.title}`);
      console.log(`      url:     ${fixture.url}`);
      console.log(`      ogImage: ${fixture.ogImage}`);
    }
    console.log("");
    console.log("Re-run without --dry-run to actually insert + enqueue.");
    return;
  }

  let succeeded = 0;
  let failed = 0;
  const failures: { error: string; fixture: string }[] = [];

  for (const fixture of slice) {
    try {
      const inserted = await insertFixture(fixture, userId);
      await enqueueForEnrichment(inserted);
      succeeded += 1;
      console.log(`[seed-twitter] Seeded id=${inserted.id}  ${fixture.url}`);
    } catch (error: unknown) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ error: message, fixture: fixture.url });
      console.error(`[seed-twitter] FAILED  ${fixture.url}  error=${message}`);
    }
  }

  console.log("");
  console.log("=== Seed Summary ===");
  console.log(`Attempted:  ${slice.length}`);
  console.log(`Succeeded:  ${succeeded}`);
  console.log(`Failed:     ${failed}`);

  if (failures.length > 0) {
    console.log("");
    console.log("=== Failures ===");
    for (const failure of failures) {
      console.log(`  url=${failure.fixture}  error=${failure.error}`);
    }
    process.exit(1);
  }
}

try {
  await main();
} catch (error: unknown) {
  console.error("[seed-twitter] Fatal error:", error);
  process.exit(1);
}
