/**
 * Fix script: reconcile `profiles.category_order` with the set of category IDs
 * actually owned by each user.
 *
 * The `profiles.category_order` column is an ordered array of user-created
 * category IDs (category 0 / Uncategorized is system-managed and not part of
 * this array). Over time these can drift out of sync with the `categories`
 * table — deletions that didn't clean up `category_order`, creations that
 * didn't append, direct DB edits, etc.
 *
 * This script:
 *   --all            Lists every user whose `category_order.length` does not
 *                    match their actual category count. Read-only.
 *
 *   --run <user_id>  Overwrites that user's `category_order` with all of the
 *                    category IDs they currently own. Existing ordering is
 *                    preserved for IDs that still exist; stale IDs are dropped;
 *                    missing IDs are appended at the end (ordered by category
 *                    id ascending for determinism).
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
 *   # List every user whose category_order length != actual category count
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/fix-category-order.ts --all
 *
 *   # Fix a single user's category_order
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/fix-category-order.ts --run <uuid>
 */

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROFILES_TABLE_NAME = "profiles";
const CATEGORIES_TABLE_NAME = "categories";
const PAGE_SIZE = 1000;

// CLI mode parsing.
type CliMode = { kind: "all" } | { kind: "run"; userId: string };

function printUsageAndExit(message: string): never {
  console.error(`[fix-category-order] ${message}`);
  console.error("");
  console.error("Usage:");
  console.error("  npx tsx scripts/fix-category-order.ts --all");
  console.error("  npx tsx scripts/fix-category-order.ts --run <uuid>");
  process.exit(1);
}

function parseCliMode(): CliMode {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    return { kind: "all" };
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
    console.error(`[fix-category-order] Missing required env var: ${name}`);
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

interface ProfileRow {
  category_order: null | number[];
  display_name: null | string;
  email: null | string;
  id: string;
  user_name: null | string;
}

interface CategoryRow {
  id: number;
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
      .select("id, user_name, display_name, email, category_order")
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

async function fetchProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from(PROFILES_TABLE_NAME)
    .select("id, user_name, display_name, email, category_order")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Profile fetch failed for ${userId}: ${error.message}`);
  }

  return data as ProfileRow;
}

// Fetches all category IDs owned by the user. Uncategorized (id 0) has
// `user_id = NULL` and is therefore excluded naturally by the `.eq` filter.
async function fetchUserCategoryIds(userId: string): Promise<number[]> {
  const ids: number[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(CATEGORIES_TABLE_NAME)
      .select("id")
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `Categories fetch failed for ${userId} at offset ${offset}: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data as CategoryRow[]) {
      ids.push(row.id);
    }

    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return ids;
}

async function countUserCategories(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(CATEGORIES_TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Category count failed for ${userId}: ${error.message}`);
  }

  return count ?? 0;
}

async function updateCategoryOrder(userId: string, categoryOrder: number[]): Promise<void> {
  const { error } = await supabase
    .from(PROFILES_TABLE_NAME)
    .update({ category_order: categoryOrder })
    .match({ id: userId });

  if (error) {
    throw new Error(`category_order update failed for ${userId}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

// Builds the corrected category_order array:
//   - Keeps every existing entry that still resolves to a real category,
//     preserving its current position.
//   - Drops stale IDs (present in category_order but not in `categories`).
//   - Appends any IDs the user owns that are missing from category_order,
//     ordered by id ascending for deterministic output.
function reconcileCategoryOrder(
  currentOrder: null | number[],
  actualIds: number[],
): { added: number[]; dropped: number[]; next: number[] } {
  const actualIdSet = new Set(actualIds);
  const current = Array.isArray(currentOrder) ? currentOrder : [];

  const kept: number[] = [];
  const seen = new Set<number>();
  const dropped: number[] = [];

  for (const id of current) {
    if (actualIdSet.has(id) && !seen.has(id)) {
      kept.push(id);
      seen.add(id);
    } else if (!actualIdSet.has(id)) {
      dropped.push(id);
    }
  }

  const added = actualIds.filter((id) => !seen.has(id)).toSorted((a, b) => a - b);
  const next = [...kept, ...added];

  return { added, dropped, next };
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function runListMismatches(): Promise<void> {
  console.log("[fix-category-order] [LIST MISMATCHES]");
  console.log(`[fix-category-order] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);

  const profiles = await fetchAllProfiles();
  console.log(`[fix-category-order] Fetched ${profiles.length} profiles`);

  const rows = await Promise.all(
    profiles.map(async (profile) => {
      const actualCount = await countUserCategories(profile.id);
      const orderLength = Array.isArray(profile.category_order) ? profile.category_order.length : 0;
      return { actualCount, orderLength, profile };
    }),
  );

  const mismatches = rows
    .filter((entry) => entry.orderLength !== entry.actualCount)
    .toSorted(
      (a, b) => Math.abs(b.actualCount - b.orderLength) - Math.abs(a.actualCount - a.orderLength),
    );

  console.log("");
  console.log("=== Users with category_order length mismatch ===");
  console.log(
    `${"order_len".padStart(10)}  ${"actual".padStart(8)}  ${"delta".padStart(8)}  user_id                               ${"user_name".padEnd(24)}  email`,
  );
  console.log(
    `${"---------".padStart(10)}  ${"------".padStart(8)}  ${"-----".padStart(8)}  ------------------------------------  ${"---------".padEnd(24)}  -----`,
  );
  for (const entry of mismatches) {
    const orderLenStr = String(entry.orderLength).padStart(10);
    const actualStr = String(entry.actualCount).padStart(8);
    const delta = entry.actualCount - entry.orderLength;
    const deltaStr = (delta > 0 ? `+${delta}` : String(delta)).padStart(8);
    const userName = (entry.profile.user_name ?? entry.profile.display_name ?? "<none>").padEnd(24);
    const email = entry.profile.email ?? "<none>";
    console.log(
      `${orderLenStr}  ${actualStr}  ${deltaStr}  ${entry.profile.id}  ${userName}  ${email}`,
    );
  }

  console.log("");
  console.log(`Total profiles scanned:  ${profiles.length}`);
  console.log(`Profiles with mismatch:  ${mismatches.length}`);

  if (mismatches.length > 0) {
    console.log("");
    console.log("To fix a user:");
    console.log("  SKIP_ENV_VALIDATION=1 npx tsx scripts/fix-category-order.ts --run <uuid>");
  }
}

async function runFixForUser(userId: string): Promise<void> {
  console.log(`[fix-category-order] [RUN] Fixing category_order for user ${userId}`);
  console.log(`[fix-category-order] Target: ${isLocal ? "local" : "dev/prod"} Supabase`);

  const [profile, actualIds] = await Promise.all([
    fetchProfile(userId),
    fetchUserCategoryIds(userId),
  ]);

  const currentOrder = profile.category_order ?? [];
  const { added, dropped, next } = reconcileCategoryOrder(currentOrder, actualIds);

  console.log("");
  console.log("=== Before ===");
  console.log(`category_order (len=${currentOrder.length}):  [${currentOrder.join(", ")}]`);
  console.log(`actual categories (len=${actualIds.length}):  [${actualIds.join(", ")}]`);

  console.log("");
  console.log("=== Reconciliation ===");
  console.log(`Dropped stale IDs (${dropped.length}):  [${dropped.join(", ")}]`);
  console.log(`Appended missing IDs (${added.length}): [${added.join(", ")}]`);

  console.log("");
  console.log("=== After ===");
  console.log(`category_order (len=${next.length}):  [${next.join(", ")}]`);

  const alreadyCorrect =
    currentOrder.length === next.length && currentOrder.every((id, i) => id === next[i]);

  if (alreadyCorrect) {
    console.log("");
    console.log("[fix-category-order] Already correct. No update needed.");
    return;
  }

  await updateCategoryOrder(userId, next);
  console.log("");
  console.log(`[fix-category-order] ✓ Updated profiles.category_order for ${userId}`);
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function runScript(): Promise<void> {
  if (cliMode.kind === "all") {
    await runListMismatches();
    return;
  }

  await runFixForUser(cliMode.userId);
}

try {
  await runScript();
} catch (error: unknown) {
  console.error("[fix-category-order] Fatal error:", error);
  process.exit(1);
}
