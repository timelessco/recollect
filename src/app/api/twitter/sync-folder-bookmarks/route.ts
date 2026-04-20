import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { TWITTER_IMPORTS_QUEUE } from "@/utils/constants";
import { toJson } from "@/utils/type-utils";

import { SyncFolderBookmarksInputSchema, SyncFolderBookmarksOutputSchema } from "./schema";

const ROUTE = "twitter-sync-folder-bookmarks";

/**
 * @deprecated Use /api/v2/twitter/sync-folder-bookmarks instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, user }) => {
    const userId = user.id;

    console.log(`[${route}] Queueing ${data.mappings.length} link messages`, {
      userId,
    });

    // Prepare queue messages with type discriminator
    const messages = data.mappings.map((mapping) => ({
      category_name: mapping.category_name,
      type: "link_bookmark_category" as const,
      url: mapping.url,
      user_id: userId,
    }));

    // Queue via pgmq.send_batch using service role client
    const serviceClient = createServerServiceClient();
    const pgmqSupabase = serviceClient.schema("pgmq_public");
    const { data: queueResults, error: queueError } = await pgmqSupabase.rpc("send_batch", {
      messages: toJson(messages),
      queue_name: TWITTER_IMPORTS_QUEUE,
      sleep_seconds: 0,
    });

    if (queueError) {
      console.error(`[${route}] Queue error:`, queueError);
      return apiError({
        error: queueError,
        message: "Failed to queue category links",
        operation: "queue_category_links",
        route,
        userId,
      });
    }

    const queuedCount = Array.isArray(queueResults) ? queueResults.length : 0;
    console.log(`[${route}] Queued successfully:`, { queued: queuedCount });

    return { queued: queuedCount };
  },
  inputSchema: SyncFolderBookmarksInputSchema,
  outputSchema: SyncFolderBookmarksOutputSchema,
  route: ROUTE,
});
