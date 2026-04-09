/**
 * Seed script: insert test Chrome bookmarks for a target user and push them
 * onto the `ai-embeddings` pgmq queue so the AI-enrichment pipeline runs end
 * to end.
 *
 * Fixture rows are hardcoded snapshots of real `type='bookmark'` rows with
 * `meta_data.is_chrome_bookmark = true`, pulled from the local Supabase once
 * during implementation. Chrome imports insert rows with `ogImage = null` and
 * `description = null` — the worker flow (`process_chrome_bookmark` RPC +
 * Edge Function) sanitizes them later. This script keeps the null shape so
 * the downstream `ai-embeddings` worker exercises the screenshot path
 * (`src/utils/worker.ts:152-180` routes null-ogImage messages to screenshot).
 *
 * Each fixture is inserted as a NEW row in `public.everything` owned by the
 * target user (Postgres assigns a fresh `id`), and then enqueued onto
 * `ai-embeddings` with the exact message shape the Chrome worker produces
 * (`process_chrome_bookmark` RPC).
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
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-chrome-imports.ts --dry-run
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-chrome-imports.ts
 *
 *   # Explicit user via CLI (fallback / override)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-chrome-imports.ts --user-id <uuid>
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/seed-chrome-imports.ts --user-id <uuid> --count 3
 */

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TABLE_NAME = "everything";
const PROFILES_TABLE_NAME = "profiles";
const BOOKMARK_TYPE = "bookmark";
const AI_EMBEDDINGS_QUEUE = "ai-embeddings";
const DEFAULT_COUNT = 5;

// ---------------------------------------------------------------------------
// Fixture rows (real `is_chrome_bookmark=true` data from local Supabase)
// ---------------------------------------------------------------------------

interface ChromeFixture {
  description: null | string;
  meta_data: Record<string, unknown>;
  ogImage: null | string;
  title: string;
  url: string;
}

// cspell:disable — fixture rows contain real GitHub repo names
const CHROME_FIXTURES: ChromeFixture[] = [
  {
    title: "Opera noeon",
    url: "https://www.operaneon.com/",
    description: null,
    ogImage: null,
    meta_data: {
      is_chrome_bookmark: true,
    },
  },
  {
    title: "land book",
    url: "https://land-book.com/",
    description: null,
    ogImage: null,
    meta_data: {
      is_chrome_bookmark: true,
    },
  },
  {
    title: "css studio",
    url: "https://cssstudio.ai/",
    description: null,
    ogImage: null,
    meta_data: {
      is_chrome_bookmark: true,
    },
  },
  {
    title: "porting-mac-os-x-nintendo-wii",
    url: "https://bryankeller.github.io/2026/04/08/porting-mac-os-x-nintendo-wii.html",
    description: null,
    ogImage: null,
    meta_data: {
      is_chrome_bookmark: true,
    },
  },
  {
    title: "Bolt ctl",
    url: "https://botctl.dev/",
    description: null,
    ogImage: null,
    meta_data: {
      is_chrome_bookmark: true,
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
  console.error(`[seed-chrome] ${message}`);
  console.error("");
  console.error("Usage:");
  console.error(
    "  npx tsx scripts/seed-chrome-imports.ts [--user-id <uuid>] [--count <n>] [--dry-run]",
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
    console.error(`[seed-chrome] Missing required env var: ${name}`);
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

async function insertFixture(fixture: ChromeFixture, userId: string): Promise<InsertedRow> {
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

  console.log(`[seed-chrome]${modeLabel} Starting`);
  console.log(`[seed-chrome] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);
  console.log(`[seed-chrome] Queue:  ${AI_EMBEDDINGS_QUEUE}`);

  const { source, userId } = resolveUserIdSource(cliUserId);
  console.log(
    `[seed-chrome] User:   ${userId} (from ${source === "env" ? "CURRENT_USER_ID env var" : "--user-id flag"})`,
  );

  await validateUserExists(userId);

  const slice = CHROME_FIXTURES.slice(0, count);
  if (slice.length === 0) {
    console.log("[seed-chrome] No fixtures to seed (count=0). Exiting.");
    return;
  }
  if (slice.length < count) {
    console.warn(
      `[seed-chrome] Requested ${count} but only ${CHROME_FIXTURES.length} fixtures are available. Seeding ${slice.length}.`,
    );
  }

  if (dryRun) {
    console.log("");
    console.log(`=== Would insert ${slice.length} chrome fixtures ===`);
    for (const [index, fixture] of slice.entries()) {
      console.log(`  [${index + 1}] ${fixture.title}`);
      console.log(`      url:     ${fixture.url}`);
      console.log(`      ogImage: ${fixture.ogImage ?? "<null>"}`);
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
      console.log(`[seed-chrome] Seeded id=${inserted.id}  ${fixture.url}`);
    } catch (error: unknown) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ error: message, fixture: fixture.url });
      console.error(`[seed-chrome] FAILED  ${fixture.url}  error=${message}`);
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
  console.error("[seed-chrome] Fatal error:", error);
  process.exit(1);
}
