import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { toJson } from "@/utils/type-utils";

import { TwitterSyncInputSchema, TwitterSyncOutputSchema } from "./schema";

const ROUTE = "twitter-sync";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, user }) => {
    const userId = user.id;

    console.log(`[${route}] Inserting ${data.bookmarks.length} bookmarks`, {
      userId,
    });

    // Call transactional RPC for synchronous dedup + insert
    const serviceClient = createServerServiceClient();
    const { data: result, error: rpcError } = await serviceClient.rpc("enqueue_twitter_bookmarks", {
      p_bookmarks: toJson(data.bookmarks),
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

    console.log(`[${route}] Result:`, parsed.data);

    return parsed.data;
  },
  inputSchema: TwitterSyncInputSchema,
  outputSchema: TwitterSyncOutputSchema,
  route: ROUTE,
});
