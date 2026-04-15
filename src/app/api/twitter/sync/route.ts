import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { getFreeTierContext, partitionByCutoff } from "@/lib/api-helpers/free-tier-gate";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { toJson } from "@/utils/type-utils";

import { TwitterSyncInputSchema, TwitterSyncOutputSchema } from "./schema";

const ROUTE = "twitter-sync";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] Inserting ${data.bookmarks.length} bookmarks`, {
      userId,
    });

    // Free-tier cutoff: silently drop tweets saved before the user's signup.
    // Authoritative save-time is `inserted_at` (decoded from snowflake sort_index
    // by the extension); `sort_index` is secondary. Missing inserted_at drops.
    const freeTier = await getFreeTierContext(supabase, userId, user.created_at);
    const { kept: allowedBookmarks, skipped: cutoffSkipped } = freeTier.isFree
      ? partitionByCutoff(
          data.bookmarks,
          (bookmark) => bookmark.inserted_at,
          freeTier.freeTierCutoffMs,
        )
      : { kept: data.bookmarks, skipped: 0 };

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
