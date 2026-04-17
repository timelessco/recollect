import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import {
  capByHistoricalBudget,
  FREE_TIER_HISTORICAL_CAP,
  getFreeHistoricalBudget,
  getFreeTierContext,
} from "@/lib/api-helpers/free-tier-gate";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { PROFILES, tweetType } from "@/utils/constants";
import { toJson } from "@/utils/type-utils";

import { TwitterSyncInputSchema, TwitterSyncOutputSchema } from "./schema";

const ROUTE = "twitter-sync";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] Inserting ${data.bookmarks.length} bookmarks`, {
      userId,
    });

    // Historical cap: enforced only during initial backfill (alreadySynced
    // < 10). Once the user has 10 items, the cap lifts and the extension's
    // `syncedCodes` boundary is the gate — only genuinely new items above
    // the wall get uploaded. The toggle (`isHistoricalRun`) bypasses the cap
    // even during initial backfill, letting paid users pull full history.
    const freeTier = await getFreeTierContext(supabase, userId, user.created_at);
    const { alreadySynced, remainingBudget } = await getFreeHistoricalBudget(
      supabase,
      userId,
      tweetType,
    );
    const capEnforced = !data.isHistoricalRun && alreadySynced < FREE_TIER_HISTORICAL_CAP;
    console.log(`[${route}] Cap decision:`, {
      alreadySynced,
      capEnforced,
      isHistoricalRun: data.isHistoricalRun ?? false,
      plan: freeTier.plan,
      remainingBudget,
      requestedCount: data.bookmarks.length,
    });
    let cutoffSkipped = 0;
    let allowedBookmarks = data.bookmarks;

    if (capEnforced) {
      const capped = capByHistoricalBudget(
        data.bookmarks,
        (bookmark) => bookmark.inserted_at,
        remainingBudget,
      );
      allowedBookmarks = capped.kept;
      cutoffSkipped = capped.skipped;
    }

    if (allowedBookmarks.length === 0) {
      return {
        inserted: 0,
        skipped: cutoffSkipped,
      };
    }

    // Call transactional RPC for synchronous dedup + insert
    const serviceClient = createServerServiceClient();
    const { data: result, error: rpcError } = await serviceClient.rpc("enqueue_twitter_bookmarks", {
      p_bookmarks: toJson(allowedBookmarks),
      p_user_id: userId,
    });

    if (rpcError) {
      console.error(`[${route}] RPC error:`, rpcError);
      return apiError({
        error: rpcError,
        message: "Failed to insert bookmarks",
        operation: "enqueue_twitter_bookmarks",
        route,
        userId,
      });
    }

    const parsed = TwitterSyncOutputSchema.safeParse(result);
    if (!parsed.success) {
      console.error(`[${route}] Unexpected RPC result:`, result);
      return apiError({
        error: new Error("Unexpected RPC result shape"),
        extra: { result },
        message: "Failed to insert bookmarks",
        operation: "enqueue_twitter_bookmarks",
        route,
        userId,
      });
    }

    // Historical sync completion: extension reports `hasMore === false` on the
    // final pagination page. Only flip for paid users (free users are capped).
    if (data.historicalSyncComplete && !freeTier.isFree) {
      const { error: flagError } = await serviceClient
        .from(PROFILES)
        .update({ twitter_historical_synced: true })
        .eq("id", userId);

      if (flagError) {
        console.error(`[${route}] Failed to set twitter_historical_synced:`, flagError);
      }
    }

    const payload = {
      inserted: parsed.data.inserted,
      skipped: parsed.data.skipped + cutoffSkipped,
    };

    console.log(`[${route}] Result:`, payload);

    return payload;
  },
  inputSchema: TwitterSyncInputSchema,
  outputSchema: TwitterSyncOutputSchema,
  route: ROUTE,
});
