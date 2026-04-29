/**
 * Enqueue script: push Chrome-imported bookmarks that are missing enrichment
 * onto the `ai-embeddings` pgmq queue so the worker can fill in the gaps.
 *
 * "Missing enrichment" criteria for a Chrome bookmark (`type='bookmark'` with
 * `meta_data.is_chrome_bookmark = true`, not trashed):
 *
 *   INCLUDE if  ogImage IS NULL                                   (needs full re-fetch)
 *   INCLUDE if  ogImage IS NOT NULL
 *               AND meta_data->>'ocr' IS NULL
 *               AND ogImage host is NOT our bucket                (mirror + re-OCR)
 *   SKIP    if  ocr is null AND ogImage already on our bucket     (already mirrored, OCR will catch up)
 *   SKIP    if  ocr is present                                    (fully enriched)
 *
 * "Our bucket" = `NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL`
 * (e.g. https://media.recollect.so or https://media-dev.recollect.so).
 *
 * Storage backend selection mirrors `src/utils/storageClient.ts:13`:
 *   - Local dev (NODE_ENV != "production" and NEXT_PUBLIC_DEV_SUPABASE_URL set):
 *       local Supabase
 *   - Otherwise: dev/prod Supabase
 *
 * Self-contained (no `@/` alias imports) so it runs under `tsx` without
 * tsconfig-paths registration.
 *
 * Target user resolution (in order):
 *   1. `--user-id <uuid>` CLI flag
 *   2. `CURRENT_USER_ID` env var
 *   (Required for --dry-run and --run; --all ignores user.)
 *
 * Usage:
 *   # Global overview: every user's missing-enrichment Chrome bookmark count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --all
 *
 *   # Stats + sample for the resolved user (no enqueue)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --dry-run
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --dry-run --user-id <uuid>
 *
 *   # Actually push every eligible row onto ai-embeddings
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --run
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --run --user-id <uuid>
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
const PAGE_SIZE = 1000;
const SAMPLE_SIZE = 10;

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

type CliMode =
  | { kind: "all" }
  | { kind: "dry-run"; limit: null | number; userId: null | string }
  | { kind: "run"; limit: null | number; userId: null | string };

function printUsageAndExit(message: string): never {
  console.error(`[chrome-enrich] ${message}`);
  console.error("");
  console.error("Usage:");
  console.error("  npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --all");
  console.error(
    "  npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --dry-run [--user-id <uuid>] [--limit <n>]",
  );
  console.error(
    "  npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --run [--user-id <uuid>] [--limit <n>]",
  );
  console.error("");
  console.error(
    "  --limit <n>  cap the number of rows enqueued/sampled (e.g. --limit 1 for testing)",
  );
  console.error("");
  console.error("  Target user resolution (--dry-run / --run):");
  console.error("    1. --user-id <uuid> CLI flag");
  console.error("    2. CURRENT_USER_ID env var");
  process.exit(1);
}

function readUserIdFlag(args: string[]): null | string {
  const idx = args.indexOf("--user-id");
  if (idx === -1) {
    return null;
  }
  const value = args[idx + 1];
  if (!value || value.startsWith("--")) {
    printUsageAndExit("--user-id requires a <uuid> value");
  }
  return value;
}

function readLimitFlag(args: string[]): null | number {
  const idx = args.indexOf("--limit");
  if (idx === -1) {
    return null;
  }
  const raw = args[idx + 1];
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    printUsageAndExit("--limit requires a positive integer (e.g. --limit 1)");
  }
  return parsed;
}

function parseCliMode(): CliMode {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    return { kind: "all" };
  }

  if (args.includes("--dry-run")) {
    return { kind: "dry-run", limit: readLimitFlag(args), userId: readUserIdFlag(args) };
  }

  if (args.includes("--run")) {
    return { kind: "run", limit: readLimitFlag(args), userId: readUserIdFlag(args) };
  }

  return printUsageAndExit("No mode specified.");
}

const cliMode = parseCliMode();

function resolveUserId(cliUserId: null | string): string {
  if (cliUserId) {
    return cliUserId;
  }
  const envUserId = process.env.CURRENT_USER_ID?.trim();
  if (envUserId) {
    return envUserId;
  }
  return printUsageAndExit("No target user. Pass --user-id <uuid> or set CURRENT_USER_ID in .env.");
}

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
    console.error(`[chrome-enrich] Missing required env var: ${name}`);
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

// "Our bucket" prefix — used to detect ogImages we've already mirrored.
// Trailing slash stripped so the substring match is `${BUCKET_PREFIX}/...`.
const BUCKET_PREFIX = (process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL ?? "").replace(
  /\/+$/,
  "",
);

if (!BUCKET_PREFIX) {
  console.error(
    "[chrome-enrich] Missing required env var: NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL",
  );
  process.exit(1);
}

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
// Eligibility predicate (single source of truth)
// ---------------------------------------------------------------------------
// Mirrors the SQL filter:
//   ogImage IS NULL
//   OR (ocr IS NULL AND ogImage not in our bucket)
//
// We can't express "ogImage not in our bucket" cleanly across all PostgREST
// query builders, so we over-fetch candidates (ogImage null OR ocr null) and
// partition in JS.
function isEligible(row: BookmarkRow): boolean {
  if (row.ogImage === null) {
    return true;
  }

  const ocr = row.meta_data?.ocr;
  const ocrMissing =
    ocr === null || ocr === undefined || (typeof ocr === "string" && ocr.trim() === "");
  if (!ocrMissing) {
    return false;
  }

  return !row.ogImage.startsWith(`${BUCKET_PREFIX}/`);
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

async function countChromeBookmarksForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", BOOKMARK_TYPE)
    .is("trash", null)
    .filter("meta_data->>is_chrome_bookmark", "eq", "true");

  if (error) {
    throw new Error(`Chrome bookmark count failed for ${userId}: ${error.message}`);
  }

  return count ?? 0;
}

// Fetches one page of Chrome bookmarks where either ogImage OR ocr is missing.
// The bucket-URL exclusion is applied client-side via isEligible().
async function fetchCandidatePage(
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
    .filter("meta_data->>is_chrome_bookmark", "eq", "true")
    .or("ogImage.is.null,meta_data->>ocr.is.null")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Candidate fetch failed at offset ${offset}: ${error.message}`);
  }

  return (data ?? []) as BookmarkRow[];
}

async function fetchAllEligibleForUser(userId: string): Promise<BookmarkRow[]> {
  const eligible: BookmarkRow[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchCandidatePage(userId, offset, PAGE_SIZE);
    if (page.length === 0) {
      break;
    }

    eligible.push(...page.filter((row) => isEligible(row)));

    if (page.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  return eligible;
}

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

async function enqueueForEnrichment(row: BookmarkRow): Promise<void> {
  const existingMetaData = row.meta_data ?? {};
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
  console.log("[chrome-enrich] [GLOBAL STATS]");
  console.log(`[chrome-enrich] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);
  console.log(`[chrome-enrich] Bucket: ${BUCKET_PREFIX}`);

  const profiles = await fetchAllProfiles();
  console.log(`[chrome-enrich] Fetched ${profiles.length} profiles`);

  const counts = await Promise.all(
    profiles.map(async (profile) => {
      const [total, eligible] = await Promise.all([
        countChromeBookmarksForUser(profile.id),
        fetchAllEligibleForUser(profile.id).then((rows) => rows.length),
      ]);
      return { eligible, profile, total };
    }),
  );

  const withEligible = counts
    .filter((entry) => entry.eligible > 0)
    .toSorted((a, b) => b.eligible - a.eligible);

  const grandTotalChrome = counts.reduce((sum, entry) => sum + entry.total, 0);
  const grandEligible = counts.reduce((sum, entry) => sum + entry.eligible, 0);

  console.log("");
  console.log("=== Chrome bookmarks missing enrichment per user ===");
  console.log(
    `${"total".padStart(8)}  ${"to_queue".padStart(8)}  user_id                               ${"user_name".padEnd(24)}  email`,
  );
  console.log(
    `${"-----".padStart(8)}  ${"--------".padStart(8)}  ------------------------------------  ${"---------".padEnd(24)}  -----`,
  );
  for (const entry of withEligible) {
    const totalStr = String(entry.total).padStart(8);
    const eligibleStr = String(entry.eligible).padStart(8);
    const userName = (entry.profile.user_name ?? entry.profile.display_name ?? "<none>").padEnd(24);
    const email = entry.profile.email ?? "<none>";
    console.log(`${totalStr}  ${eligibleStr}  ${entry.profile.id}  ${userName}  ${email}`);
  }
  console.log("");
  console.log(`Users with eligible Chrome bookmarks: ${withEligible.length}`);
  console.log(`Total Chrome bookmarks across all users: ${grandTotalChrome}`);
  console.log(`Total eligible (missing enrichment):     ${grandEligible}`);
}

async function runUserStats(
  userId: string,
  shouldRun: boolean,
  limit: null | number,
): Promise<void> {
  const modeLabel = shouldRun ? " [ENQUEUING]" : " [DRY-RUN]";
  console.log(`[chrome-enrich]${modeLabel} Starting for user ${userId}`);
  console.log(`[chrome-enrich] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);
  console.log(`[chrome-enrich] Bucket: ${BUCKET_PREFIX}`);
  console.log(`[chrome-enrich] Queue:  ${AI_EMBEDDINGS_QUEUE}`);
  if (limit !== null) {
    console.log(`[chrome-enrich] Limit:  ${limit} (cap)`);
  }

  const totalChrome = await countChromeBookmarksForUser(userId);
  const eligibleRows = await fetchAllEligibleForUser(userId);
  const eligibleCount = eligibleRows.length;

  // Sub-counts so we can see WHICH branch caught each row.
  let nullOgImage = 0;
  let nullOcrExternal = 0;
  for (const row of eligibleRows) {
    if (row.ogImage === null) {
      nullOgImage += 1;
    } else {
      nullOcrExternal += 1;
    }
  }

  console.log("");
  console.log("=== Stats ===");
  console.log(`Total Chrome bookmarks:          ${totalChrome}`);
  console.log(`Eligible (missing enrichment):   ${eligibleCount}`);
  console.log(`  ├─ ogImage IS NULL:            ${nullOgImage}`);
  console.log(`  └─ ocr null + external host:   ${nullOcrExternal}`);

  if (eligibleCount === 0) {
    console.log("");
    console.log("[chrome-enrich] Nothing to enqueue. Exiting.");
    return;
  }

  if (!shouldRun) {
    const sample = eligibleRows.slice(0, SAMPLE_SIZE);
    console.log("");
    console.log(`=== Sample (first ${sample.length}) ===`);
    console.log(`${"id".padStart(10)}  ${"reason".padEnd(22)}  ${"ogImage".padEnd(60)}  url`);
    console.log(`${"--".padStart(10)}  ${"------".padEnd(22)}  ${"-------".padEnd(60)}  ---`);
    for (const row of sample) {
      const idStr = String(row.id).padStart(10);
      const reason = (row.ogImage === null ? "null_ogimage" : "null_ocr_external").padEnd(22);
      const ogImage = (row.ogImage ?? "<null>").padEnd(60);
      const url = row.url ?? "<null>";
      console.log(`${idStr}  ${reason}  ${ogImage}  ${url}`);
    }
    console.log("");
    console.log("To actually enqueue every eligible row:");
    console.log(
      `  SKIP_ENV_VALIDATION=1 npx tsx scripts/find-chrome-bookmarks-missing-enrichment.ts --run --user-id ${userId}`,
    );
    return;
  }

  console.log("");
  const rowsToEnqueue = limit === null ? eligibleRows : eligibleRows.slice(0, limit);
  console.log(
    `[chrome-enrich] Pushing ${rowsToEnqueue.length}/${eligibleCount} rows onto ${AI_EMBEDDINGS_QUEUE}...`,
  );

  let succeeded = 0;
  let failed = 0;
  const failures: { error: string; id: number }[] = [];

  for (const row of rowsToEnqueue) {
    try {
      await enqueueForEnrichment(row);
      succeeded += 1;
      console.log(
        `[chrome-enrich] Pushed id=${row.id} (${succeeded}/${rowsToEnqueue.length}) url=${row.url ?? "<null>"}`,
      );
    } catch (error: unknown) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ error: message, id: row.id });
      console.error(`[chrome-enrich] FAILED id=${row.id} error=${message}`);
    }
  }

  console.log("");
  console.log("=== Enqueue Summary ===");
  console.log(`Eligible:  ${eligibleCount}`);
  console.log(`Pushed:    ${rowsToEnqueue.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);

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

  const userId = resolveUserId(cliMode.userId);
  await runUserStats(userId, cliMode.kind === "run", cliMode.limit);
}

try {
  await runScript();
} catch (error: unknown) {
  console.error("[chrome-enrich] Fatal error:", error);
  process.exit(1);
}
