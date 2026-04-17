import { z } from "zod";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import {
  capByHistoricalBudget,
  FREE_TIER_HISTORICAL_CAP,
  getFreeTierContext,
} from "@/lib/api-helpers/free-tier-gate";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { PROFILES } from "@/utils/constants";
import { toJson } from "@/utils/type-utils";

import { ChromeBookmarkImportInputSchema, ChromeBookmarkImportOutputSchema } from "./schema";

const ROUTE = "v2-chrome-bookmark-import";

const RpcResultSchema = z.object({
  inserted: z.int(),
  skipped: z.int(),
});

const ProfileFlagsSchema = z.object({
  chrome_first_import_at: z.string().nullable(),
  chrome_historical_synced: z.boolean(),
});

type BookmarkInput = z.infer<typeof ChromeBookmarkImportInputSchema>["bookmarks"][number];

function parseIso(raw: null | string | undefined): number {
  if (!raw) {
    return Number.NaN;
  }

  return Date.parse(raw);
}

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_count = data.bookmarks.length;
      }

      // In-memory deduplicate: remove exact URL duplicates within the batch
      const seen = new Set<string>();
      const uniqueBookmarks = data.bookmarks.filter((bookmark) => {
        const key = bookmark.url;
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });

      const inMemorySkipped = data.bookmarks.length - uniqueBookmarks.length;

      if (ctx?.fields) {
        ctx.fields.in_memory_skipped = inMemorySkipped;
      }

      const freeTier = await getFreeTierContext(supabase, userId, user.created_at);
      const capEnforced = freeTier.isFree || !data.isHistoricalRun;

      // Cap semantics (Chrome has no pagination cursor, so we use a boundary
      // timestamp instead of a count for the differential phase):
      //  - First import: take top 10 newest, stamp chrome_first_import_at
      //  - Subsequent imports: filter to bookmarks added after the boundary
      //  - Cap bypassed only when a paid user flipped the toggle on AND the
      //    platform isn't already marked historical-synced.
      const serviceClient = createServerServiceClient();
      let allowedBookmarks: BookmarkInput[] = uniqueBookmarks;
      let cutoffSkipped = 0;
      let stampFirstImport = false;

      if (capEnforced) {
        const { data: flagsRow, error: flagsError } = await supabase
          .from(PROFILES)
          .select("chrome_first_import_at, chrome_historical_synced")
          .eq("id", userId)
          .maybeSingle();

        if (flagsError) {
          throw new RecollectApiError("service_unavailable", {
            cause: flagsError,
            message: "Failed to read chrome sync state",
            operation: "chrome_first_import_at_fetch",
          });
        }

        const flags = ProfileFlagsSchema.safeParse(flagsRow ?? {}).data ?? {
          chrome_first_import_at: null,
          chrome_historical_synced: false,
        };

        if (flags.chrome_historical_synced) {
          // Platform already fully synced — no cap ever applies again.
        } else if (flags.chrome_first_import_at) {
          // Differential: only accept bookmarks added strictly after boundary
          const boundaryMs = Date.parse(flags.chrome_first_import_at);
          const kept: BookmarkInput[] = [];
          for (const bookmark of uniqueBookmarks) {
            const ms = parseIso(bookmark.inserted_at);
            if (Number.isFinite(ms) && ms > boundaryMs) {
              kept.push(bookmark);
            } else {
              cutoffSkipped += 1;
            }
          }
          allowedBookmarks = kept;
        } else {
          // First import: take top N newest, stamp the boundary
          const capped = capByHistoricalBudget(
            uniqueBookmarks,
            (bookmark) => bookmark.inserted_at,
            FREE_TIER_HISTORICAL_CAP,
          );
          allowedBookmarks = capped.kept;
          cutoffSkipped = capped.skipped;
          stampFirstImport = allowedBookmarks.length > 0;
        }
      }

      if (ctx?.fields) {
        ctx.fields.free_tier_skipped = cutoffSkipped;
      }

      if (allowedBookmarks.length === 0) {
        return {
          queued: 0,
          skipped: inMemorySkipped + cutoffSkipped,
        };
      }

      // Call enqueue_chrome_bookmarks RPC via service role client
      // (authenticated users don't have direct queue access for security)
      const { data: result, error: rpcError } = await serviceClient.rpc(
        "enqueue_chrome_bookmarks",
        {
          p_bookmarks: toJson(allowedBookmarks),
          p_user_id: userId,
        },
      );

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to queue bookmarks for import",
          operation: "enqueue_chrome_bookmarks",
        });
      }

      const parsed = RpcResultSchema.safeParse(result);
      if (!parsed.success) {
        throw new RecollectApiError("service_unavailable", {
          cause: parsed.error,
          message: "Unexpected response from enqueue operation",
          operation: "enqueue_chrome_bookmarks_parse",
        });
      }

      // Persist boundary / completion flags after successful enqueue.
      const profileUpdate: {
        chrome_first_import_at?: string;
        chrome_historical_synced?: boolean;
      } = {};

      if (stampFirstImport) {
        profileUpdate.chrome_first_import_at = new Date().toISOString();
      }

      if (data.historicalSyncComplete && !freeTier.isFree) {
        profileUpdate.chrome_historical_synced = true;
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: updateError } = await serviceClient
          .from(PROFILES)
          .update(profileUpdate)
          .eq("id", userId);

        if (updateError) {
          console.error(`[${ROUTE}] Failed to update profile flags:`, updateError);
        }
      }

      const totalSkipped = parsed.data.skipped + inMemorySkipped + cutoffSkipped;

      if (ctx?.fields) {
        ctx.fields.queued = parsed.data.inserted;
        ctx.fields.skipped = totalSkipped;
      }

      return {
        queued: parsed.data.inserted,
        skipped: totalSkipped,
      };
    },
    inputSchema: ChromeBookmarkImportInputSchema,
    outputSchema: ChromeBookmarkImportOutputSchema,
    route: ROUTE,
  }),
);
