/**
 * Backfill script: re-upload Twitter bookmark OG images to our storage bucket.
 *
 * Fetches all `type = 'tweet'` bookmarks for a specific user, classifies them
 * into already-uploaded / null / needs-backfill, and prints the counts.
 *
 * By default the script is STATS ONLY — it does not download, upload, or
 * update anything. Pass `--run` to actually execute the backfill after
 * reviewing the counts.
 *
 * Storage backend mirrors `src/utils/storageClient.ts:13`:
 *   - Local dev (NODE_ENV != "production" and DEV_SUPABASE_URL set):
 *       local Supabase + local Supabase storage
 *   - Otherwise: dev/prod Supabase + Cloudflare R2
 *
 * This script is intentionally self-contained (no `@/` alias imports) so that
 * it can run under `tsx` without tsconfig-paths registration.
 *
 * Usage:
 *   # Global overview: every user's tweet count with user_name + email
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/backfill-twitter-og-images.ts --all
 *
 *   # Stats for one user (no side effects)
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/backfill-twitter-og-images.ts --dry-run <uuid>
 *
 *   # Execute backfill for one user
 *   SKIP_ENV_VALIDATION=1 npx tsx scripts/backfill-twitter-og-images.ts --run <uuid>
 */

import "dotenv/config";

import { setTimeout as sleep } from "node:timers/promises";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { decode } from "base64-arraybuffer";
import uniqid from "uniqid";

import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TABLE_NAME = "everything";
const PROFILES_TABLE_NAME = "profiles";
const BOOKMARK_TYPE = "tweet";
const PBS_TWIMG_PREFIX = "https://pbs.twimg.com/";
const STORAGE_PATH_PREFIX = "bookmarks/public/scrapped_imgs";
const PAGE_SIZE = 1000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 10_000;
const IMAGE_JPEG_MIME_TYPE = "image/jpeg";
const DELAY_BETWEEN_ROWS_MS = 150;

// CLI mode parsing.
//   --all                : global stats across every user (no side effects)
//   --dry-run <uuid>     : stats for one user (no side effects)
//   --run <uuid>         : execute backfill for one user
type CliMode =
  | { kind: "all" }
  | { kind: "dry-run"; userId: string }
  | { kind: "run"; userId: string };

function printUsageAndExit(message: string): never {
  console.error(`[backfill] ${message}`);
  console.error("");
  console.error("Usage:");
  console.error("  npx tsx scripts/backfill-twitter-og-images.ts --all");
  console.error("  npx tsx scripts/backfill-twitter-og-images.ts --dry-run <uuid>");
  console.error("  npx tsx scripts/backfill-twitter-og-images.ts --run <uuid>");
  process.exit(1);
}

function parseCliMode(): CliMode {
  //console.log(process.argv);

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

// Mirrors `src/utils/storageClient.ts:13` exactly:
//   - isLocal (useLocalStorage):  NODE_ENV !== "production" AND DEV_SUPABASE_URL set
//     -> Talk to local Supabase + upload images to local Supabase storage
//   - Otherwise: talk to dev/prod Supabase + upload images to Cloudflare R2
//     (whichever bucket NEXT_PUBLIC_CLOUDFLARE_* env vars point to — dev or prod)
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
    console.error(`[backfill] Missing required env var: ${name}`);
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
// Bucket name is shared across both backends — local Supabase storage uses the
// same bucket name as R2 (e.g. "recollect-dev"). See storageClient.ts which
// passes R2_MAIN_BUCKET_NAME to both `r2Helpers.uploadObject` and
// `supabaseStorageHelpers.uploadObject`.
const BUCKET_NAME = assertEnv(
  "NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME",
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET_NAME,
);

// R2 credentials are only needed when NOT running against local Supabase.
const R2_ACCOUNT_ID = isLocal
  ? ""
  : assertEnv("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID", process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID);
const R2_ACCESS_KEY_ID = isLocal
  ? ""
  : assertEnv(
      "NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID",
      process.env.NEXT_PUBLIC_CLOUDFLARE_ACCESS_KEY_ID,
    );
const R2_SECRET_ACCESS_KEY = isLocal
  ? ""
  : assertEnv(
      "NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY",
      process.env.NEXT_PUBLIC_CLOUDFLARE_SECRET_ACCESS_KEY,
    );
const R2_PUBLIC_BUCKET_URL = isLocal
  ? ""
  : assertEnv(
      "NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL",
      process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_BUCKET_URL,
    );

// Public URL base for whichever backend is active.
//   Local:  http://127.0.0.1:54321/storage/v1/object/public/recollect-dev
//   R2:     https://media-dev.recollect.so   (or media.recollect.so for prod)
const PUBLIC_URL_BASE = isLocal
  ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}`
  : R2_PUBLIC_BUCKET_URL;

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

// Only initialize the R2 client when actually uploading to R2.
const s3: S3Client | null = isLocal
  ? null
  : new S3Client({
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: "auto",
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetaData = Record<string, unknown> | null;

interface BookmarkRow {
  id: number;
  meta_data: MetaData;
  ogImage: string | null;
}

interface ProcessResult {
  error?: string;
  status: "skipped_no_og_image" | "succeeded" | "failed";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPublicUrl(path: string): string {
  return `${PUBLIC_URL_BASE}/${path}`;
}

async function downloadImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        Accept: "image/*,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[backfill] Download failed: ${imageUrl} (${response.status} ${response.statusText})`,
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error(`[backfill] Download exception for ${imageUrl}:`, error);
    return null;
  }
}

async function uploadImage(base64Data: string, userId: string): Promise<string | null> {
  const imgName = `img-${uniqid.time()}.jpg`;
  const storagePath = `${STORAGE_PATH_PREFIX}/${userId}/${imgName}`;
  const body = new Uint8Array(decode(base64Data));

  try {
    if (isLocal) {
      // Mirror `supabaseStorageHelpers.uploadObject` from src/utils/storageClient.ts
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, body, {
        contentType: IMAGE_JPEG_MIME_TYPE,
        upsert: true,
      });

      if (error) {
        console.error(`[backfill] Supabase storage upload failed for ${storagePath}:`, error);
        return null;
      }
    } else {
      // Mirror `r2Helpers.uploadObject` from src/utils/r2Client.ts
      if (!s3) {
        throw new Error("R2 client not initialized");
      }
      await s3.send(
        new PutObjectCommand({
          Body: body,
          Bucket: BUCKET_NAME,
          ContentType: IMAGE_JPEG_MIME_TYPE,
          Key: storagePath,
        }),
      );
    }

    return buildPublicUrl(storagePath);
  } catch (error) {
    console.error(`[backfill] Upload exception for ${storagePath}:`, error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data fetch
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Global stats (--dry-run)
// ---------------------------------------------------------------------------

interface ProfileRow {
  display_name: null | string;
  email: null | string;
  id: string;
  user_name: null | string;
}

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

// Counts tweets whose ogImage still points at pbs.twimg.com — these are the
// rows the backfill would actually download and re-upload.
async function countNeedsBackfillForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", BOOKMARK_TYPE)
    .is("trash", null)
    .like("ogImage", `${PBS_TWIMG_PREFIX}%`);

  if (error) {
    throw new Error(`Needs-backfill count failed for ${userId}: ${error.message}`);
  }

  return count ?? 0;
}

async function runGlobalStats(): Promise<void> {
  console.log("[backfill] [GLOBAL STATS]");
  console.log(
    `[backfill] Target: ${isLocal ? "local" : "dev/prod"} Supabase + ${isLocal ? "local Supabase storage" : "Cloudflare R2"} bucket "${BUCKET_NAME}"`,
  );

  const profiles = await fetchAllProfiles();
  console.log(`[backfill] Fetched ${profiles.length} profiles`);

  // Count total tweets AND needs-backfill tweets per profile in parallel.
  const counts = await Promise.all(
    profiles.map(async (profile) => {
      const [total, needsBackfill] = await Promise.all([
        countTweetsForUser(profile.id),
        countNeedsBackfillForUser(profile.id),
      ]);
      return { needsBackfill, profile, total };
    }),
  );

  // Only show users who have at least one tweet, highest total first.
  const withTweets = counts
    .filter((entry) => entry.total > 0)
    .toSorted((a, b) => b.total - a.total);

  const grandTotal = withTweets.reduce((sum, entry) => sum + entry.total, 0);
  const grandNeedsBackfill = withTweets.reduce((sum, entry) => sum + entry.needsBackfill, 0);

  console.log("");
  console.log("=== Tweets per user ===");
  console.log(
    `${"total".padStart(8)}  ${"to_fill".padStart(8)}  user_id                               ${"user_name".padEnd(24)}  email`,
  );
  console.log(
    `${"-----".padStart(8)}  ${"-------".padStart(8)}  ------------------------------------  ${"---------".padEnd(24)}  -----`,
  );
  for (const entry of withTweets) {
    const totalStr = String(entry.total).padStart(8);
    const backfillStr = String(entry.needsBackfill).padStart(8);
    const userName = (entry.profile.user_name ?? entry.profile.display_name ?? "<none>").padEnd(24);
    const email = entry.profile.email ?? "<none>";
    console.log(`${totalStr}  ${backfillStr}  ${entry.profile.id}  ${userName}  ${email}`);
  }
  console.log("");
  console.log(`Users with tweets: ${withTweets.length}`);
  console.log(`Total tweets across all users: ${grandTotal}`);
  console.log(`Total to backfill (pbs.twimg.com): ${grandNeedsBackfill}`);
}

// Fetches only the tweet rows that actually need backfilling — ogImage still
// points at pbs.twimg.com. SQL-level filtering avoids loading rows that are
// already on our storage backend or have no ogImage.
async function fetchTweetsNeedingBackfill(userId: string): Promise<BookmarkRow[]> {
  const rows: BookmarkRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("id, ogImage, meta_data")
      .eq("user_id", userId)
      .eq("type", BOOKMARK_TYPE)
      .is("trash", null)
      .like("ogImage", `${PBS_TWIMG_PREFIX}%`)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Supabase fetch failed at offset ${offset}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...(data as BookmarkRow[]));

    if (data.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Per-row processing
// ---------------------------------------------------------------------------

async function processBookmark(row: BookmarkRow, userId: string): Promise<ProcessResult> {
  // Classification is done up-front by the orchestrator, so this function
  // only handles the actual download/upload/update path.
  if (!row.ogImage) {
    return { status: "skipped_no_og_image" };
  }

  const base64Data = await downloadImageAsBase64(row.ogImage);
  if (!base64Data) {
    return { status: "failed", error: "download_failed" };
  }

  const uploadedUrl = await uploadImage(base64Data, userId);
  if (!uploadedUrl) {
    return { status: "failed", error: "upload_failed" };
  }

  const updatedMetaData = {
    ...row.meta_data,
    coverImage: uploadedUrl,
  };

  const { error: updateError } = await supabase
    .from(TABLE_NAME)
    .update({
      meta_data: updatedMetaData,
      ogImage: uploadedUrl,
    })
    .eq("id", row.id);

  if (updateError) {
    return { status: "failed", error: `db_update_failed: ${updateError.message}` };
  }

  console.log(`[backfill] id=${row.id} -> ${uploadedUrl}`);
  return { status: "succeeded" };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

async function runBackfill(): Promise<void> {
  // --all: global overview of every user's tweet counts, then exit.
  if (cliMode.kind === "all") {
    await runGlobalStats();
    return;
  }

  const { userId } = cliMode;
  const shouldRun = cliMode.kind === "run";
  const modeLabel = shouldRun ? " [EXECUTING]" : " [DRY-RUN]";
  console.log(`[backfill]${modeLabel} Starting for user ${userId}`);
  console.log(
    `[backfill] Target: ${isLocal ? "local" : "dev/prod"} Supabase + ${isLocal ? "local Supabase storage" : "Cloudflare R2"} bucket "${BUCKET_NAME}"`,
  );

  // Get total tweet count for context, then fetch only the rows that actually
  // need backfilling (ogImage starts with https://pbs.twimg.com/).
  const [totalTweets, needsBackfill] = await Promise.all([
    countTweetsForUser(userId),
    fetchTweetsNeedingBackfill(userId),
  ]);

  console.log("");
  console.log("=== Stats ===");
  console.log(`Total tweet bookmarks:           ${totalTweets}`);
  console.log(`Needs backfill (pbs.twimg.com):  ${needsBackfill.length}`);

  if (!shouldRun) {
    console.log("");
    console.log("To actually run the backfill:");
    console.log(
      `  SKIP_ENV_VALIDATION=1 npx tsx scripts/backfill-twitter-og-images.ts --run ${userId}`,
    );
    return;
  }

  if (needsBackfill.length === 0) {
    console.log("");
    console.log("[backfill] Nothing to backfill. Exiting.");
    return;
  }

  console.log("");
  console.log(`[backfill] Processing ${needsBackfill.length} bookmarks that need backfill...`);

  let succeeded = 0;
  let failed = 0;
  const failures: { error: string; id: number; ogImage: string | null }[] = [];

  for (const [index, row] of needsBackfill.entries()) {
    if ((index + 1) % 50 === 0) {
      console.log(`[backfill] Progress: ${index + 1}/${needsBackfill.length}`);
    }

    const result = await processBookmark(row, userId);

    switch (result.status) {
      case "failed": {
        failed += 1;
        failures.push({
          error: result.error ?? "unknown",
          id: row.id,
          ogImage: row.ogImage,
        });
        console.error(
          `[backfill] FAILED id=${row.id} ogImage=${row.ogImage} error=${result.error}`,
        );
        break;
      }
      case "skipped_no_og_image": {
        // Shouldn't happen since we pre-filtered, but count it defensively.
        break;
      }
      case "succeeded": {
        succeeded += 1;
        break;
      }
      default: {
        throw new Error(`Unhandled process result status: ${String(result.status)}`);
      }
    }

    // Small pacing delay to be polite to pbs.twimg.com and the storage backend.
    if (result.status === "succeeded") {
      await sleep(DELAY_BETWEEN_ROWS_MS);
    }
  }

  console.log("");
  console.log("=== Backfill Summary ===");
  console.log(`Needs backfill:     ${needsBackfill.length}`);
  console.log(`Succeeded:          ${succeeded}`);
  console.log(`Failed:             ${failed}`);

  if (failures.length > 0) {
    console.log("");
    console.log("=== Failures ===");
    for (const failure of failures) {
      console.log(`  id=${failure.id}  error=${failure.error}  ogImage=${failure.ogImage}`);
    }
  }
}

try {
  await runBackfill();
} catch (error: unknown) {
  console.error("[backfill] Fatal error:", error);
  process.exit(1);
}
