import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { getFreeTierContext, partitionByCutoff } from "@/lib/api-helpers/free-tier-gate";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
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

    // Free-tier cutoff: silently drop bookmarks saved before the user's signup
    const freeTier = await getFreeTierContext(supabase, userId, user.created_at);
    const { kept: allowedBookmarks, skipped: cutoffSkipped } = freeTier.isFree
      ? partitionByCutoff(
          uniqueBookmarks,
          (bookmark) => bookmark.saved_at,
          freeTier.freeTierCutoffMs,
        )
      : { kept: uniqueBookmarks, skipped: 0 };

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
