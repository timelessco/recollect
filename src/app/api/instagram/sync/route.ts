import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { toJson } from "@/utils/type-utils";

import { InstagramSyncInputSchema, InstagramSyncOutputSchema } from "./schema";

const ROUTE = "instagram-sync";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, user }) => {
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

    // Call transactional RPC for synchronous dedup + insert
    const serviceClient = createServerServiceClient();
    const { data: result, error: rpcError } = await serviceClient.rpc(
      "enqueue_instagram_bookmarks",
      {
        p_bookmarks: toJson(uniqueBookmarks),
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

    console.log(`[${route}] Result:`, {
      inserted: parsed.data.inserted,
      skipped: parsed.data.skipped + inMemorySkipped,
    });

    return {
      inserted: parsed.data.inserted,
      skipped: parsed.data.skipped + inMemorySkipped,
    };
  },
  inputSchema: InstagramSyncInputSchema,
  outputSchema: InstagramSyncOutputSchema,
  route: ROUTE,
});
