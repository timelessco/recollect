import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import {
  capByHistoricalBudget,
  FREE_TIER_HISTORICAL_CAP,
  getFreeHistoricalBudget,
  getFreeTierContext,
} from "@/lib/api-helpers/free-tier-gate";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { instagramType, PROFILES } from "@/utils/constants";
import { toJson } from "@/utils/type-utils";

import { InstagramSyncInputSchema, InstagramSyncOutputSchema } from "./schema";

const ROUTE = "instagram-sync";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] Inserting ${data.bookmarks.length} bookmarks`, {
      userId,
    });

    // In-memory deduplicate: remove exact URL duplicates within the batch
    const seen = new Set<string>();
    const uniqueBookmarks = data.bookmarks.filter((bookmark) => {
      if (seen.has(bookmark.url)) {
        return false;
      }

      seen.add(bookmark.url);
      return true;
    });

    const inMemorySkipped = data.bookmarks.length - uniqueBookmarks.length;

    // Historical cap: enforced only during initial backfill (alreadySynced
    // < 10). Once the user has 10 items, the cap lifts and the extension's
    // `syncedCodes` boundary is the gate — only genuinely new items above
    // the wall get uploaded. The toggle (`isHistoricalRun`) bypasses the cap
    // even during initial backfill, letting paid users pull full history.
    const freeTier = await getFreeTierContext(supabase, userId, user.created_at);
    const { alreadySynced, remainingBudget } = await getFreeHistoricalBudget(
      supabase,
      userId,
      instagramType,
    );
    const capEnforced = !data.isHistoricalRun && alreadySynced < FREE_TIER_HISTORICAL_CAP;
    console.log(`[${route}] Cap decision:`, {
      alreadySynced,
      capEnforced,
      isHistoricalRun: data.isHistoricalRun ?? false,
      plan: freeTier.plan,
      remainingBudget,
      requestedCount: uniqueBookmarks.length,
    });
    let cutoffSkipped = 0;
    let allowedBookmarks = uniqueBookmarks;

    if (capEnforced) {
      const capped = capByHistoricalBudget(
        uniqueBookmarks,
        (bookmark) => bookmark.saved_at,
        remainingBudget,
      );
      allowedBookmarks = capped.kept;
      cutoffSkipped = capped.skipped;
    }

    if (allowedBookmarks.length === 0) {
      return {
        inserted: 0,
        skipped: inMemorySkipped + cutoffSkipped,
      };
    }

    // Call transactional RPC for synchronous dedup + insert
    const serviceClient = createServerServiceClient();
    const { data: result, error: rpcError } = await serviceClient.rpc(
      "enqueue_instagram_bookmarks",
      {
        p_bookmarks: toJson(allowedBookmarks),
        p_user_id: userId,
      },
    );

    if (rpcError) {
      console.error(`[${route}] RPC error:`, rpcError);
      return apiError({
        error: rpcError,
        message: "Failed to insert bookmarks",
        operation: "enqueue_instagram_bookmarks",
        route,
        userId,
      });
    }

    const parsed = InstagramSyncOutputSchema.safeParse(result);
    if (!parsed.success) {
      console.error(`[${route}] Unexpected RPC result:`, result);
      return apiError({
        error: new Error("Unexpected RPC result shape"),
        extra: { result },
        message: "Failed to insert bookmarks",
        operation: "enqueue_instagram_bookmarks",
        route,
        userId,
      });
    }

    // Historical sync completion: extension reports `hasMore === false` on the
    // final pagination page. Only flip for paid users (free users are capped
    // and never legitimately reach the end of their history via this route).
    if (data.historicalSyncComplete && !freeTier.isFree) {
      const { error: flagError } = await serviceClient
        .from(PROFILES)
        .update({ instagram_historical_synced: true })
        .eq("id", userId);

      if (flagError) {
        console.error(`[${route}] Failed to set instagram_historical_synced:`, flagError);
      }
    }

    const totalSkipped = parsed.data.skipped + inMemorySkipped + cutoffSkipped;

    console.log(`[${route}] Result:`, {
      inserted: parsed.data.inserted,
      skipped: totalSkipped,
    });

    return {
      inserted: parsed.data.inserted,
      skipped: totalSkipped,
    };
  },
  inputSchema: InstagramSyncInputSchema,
  outputSchema: InstagramSyncOutputSchema,
  route: ROUTE,
});
