/**
 * Seed script: insert test Instagram bookmarks for a target user and push
 * them onto the `ai-embeddings` pgmq queue so the AI-enrichment pipeline runs
 * end to end.
 *
 * Fixture rows are hardcoded snapshots of real `type = 'instagram'` rows
 * pulled from the local Supabase once during implementation, so the shapes
 * match the Instagram import path exactly (title, url, description, ogImage,
 * meta_data with favIcon + instagram_username + instagram_profile_pic +
 * optional video_url + saved_collection_names).
 *
 * Each fixture is inserted as a NEW row in `public.everything` owned by the
 * target user (Postgres assigns a fresh `id`), and then enqueued onto
 * `ai-embeddings` with the exact message shape the Instagram worker produces
 * (`process_instagram_bookmark` RPC).
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
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-instagram-imports.ts --dry-run
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-instagram-imports.ts
 *
 *   # Explicit user via CLI (fallback / override)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-instagram-imports.ts --user-id <uuid>
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-instagram-imports.ts --user-id <uuid> --count 3
 */

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TABLE_NAME = "everything";
const PROFILES_TABLE_NAME = "profiles";
const BOOKMARK_TYPE = "instagram";
const AI_EMBEDDINGS_QUEUE = "ai-embeddings";
const DEFAULT_COUNT = 3;

// ---------------------------------------------------------------------------
// Fixture rows — curated Instagram test posts with paired Recollect-hosted
// video assets. Note: the `(url, user_id)` unique index
// `idx_everything_url_user_instagram` blocks re-inserting the same post for
// the same user, so fresh URLs are required per-user for repeat seeding.
// ---------------------------------------------------------------------------

interface InstagramFixture {
  description: null | string;
  meta_data: Record<string, unknown>;
  ogImage: null | string;
  title: string;
  url: string;
}

// cspell:disable — fixture titles contain raw Instagram post IDs
const INSTAGRAM_FIXTURES: InstagramFixture[] = [
  {
    description: null,
    meta_data: {
      favIcon:
        "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://instagram.com&size=128",
      saved_collection_names: [],
      video_url:
        "https://media.recollect.so/files/public/cb3a9e84-8023-4ba7-9527-b539f67ca9de/instagram-video-mn79yu2g.mp4",
    },
    ogImage: null,
    title: "Instagram Post BpTc5Q8FCob",
    url: "https://www.instagram.com/p/BpTc5Q8FCob/",
  },
  {
    description: null,
    meta_data: {
      favIcon:
        "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://instagram.com&size=128",
      saved_collection_names: [],
      video_url:
        "https://media.recollect.so/files/public/cb3a9e84-8023-4ba7-9527-b539f67ca9de/instagram-video-mn79y0lw.mp4",
    },
    ogImage: null,
    title: "Instagram Post BrIMxd-gtk7",
    url: "https://www.instagram.com/p/BrIMxd-gtk7/",
  },
  {
    description: null,
    meta_data: {
      favIcon:
        "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://instagram.com&size=128",
      saved_collection_names: [],
      video_url:
        "https://media.recollect.so/files/public/cb3a9e84-8023-4ba7-9527-b539f67ca9de/instagram-video-mn79y4tb.mp4",
    },
    ogImage: null,
    title: "Instagram Post BrQnxqJnxLG",
    url: "https://www.instagram.com/p/BrQnxqJnxLG/",
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
  console.error(`[seed-instagram] ${message}`);
  console.error("");
  console.error("Usage:");
  console.error(
    "  npx tsx scripts/seed-instagram-imports.ts [--user-id <uuid>] [--count <n>] [--dry-run]",
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
    console.error(`[seed-instagram] Missing required env var: ${name}`);
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
  description: null | string;
  id: number;
  meta_data: Record<string, unknown>;
  ogImage: null | string;
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

async function insertFixture(fixture: InstagramFixture, userId: string): Promise<InsertedRow> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      description: fixture.description,
      meta_data: fixture.meta_data,
      ogImage: fixture.ogImage,
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

  console.log(`[seed-instagram]${modeLabel} Starting`);
  console.log(`[seed-instagram] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);
  console.log(`[seed-instagram] Queue:  ${AI_EMBEDDINGS_QUEUE}`);

  const { source, userId } = resolveUserIdSource(cliUserId);
  console.log(
    `[seed-instagram] User:   ${userId} (from ${source === "env" ? "CURRENT_USER_ID env var" : "--user-id flag"})`,
  );

  await validateUserExists(userId);

  const slice = INSTAGRAM_FIXTURES.slice(0, count);
  if (slice.length === 0) {
    console.log("[seed-instagram] No fixtures to seed (count=0). Exiting.");
    return;
  }
  if (slice.length < count) {
    console.warn(
      `[seed-instagram] Requested ${count} but only ${INSTAGRAM_FIXTURES.length} fixtures are available. Seeding ${slice.length}.`,
    );
  }

  if (dryRun) {
    console.log("");
    console.log(`=== Would insert ${slice.length} instagram fixtures ===`);
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
      console.log(`[seed-instagram] Seeded id=${inserted.id}  ${fixture.url}`);
    } catch (error: unknown) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ error: message, fixture: fixture.url });
      console.error(`[seed-instagram] FAILED  ${fixture.url}  error=${message}`);
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
  console.error("[seed-instagram] Fatal error:", error);
  process.exit(1);
}
