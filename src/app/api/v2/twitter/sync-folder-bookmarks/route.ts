import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { TWITTER_IMPORTS_QUEUE } from "@/utils/constants";
import { toJson } from "@/utils/type-utils";

import { V2SyncFolderBookmarksInputSchema, V2SyncFolderBookmarksOutputSchema } from "./schema";

const ROUTE = "v2-twitter-sync-folder-bookmarks";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }
      setPayload(ctx, { mappings_count: data.mappings.length });

      // Prepare queue messages with type discriminator.
      const messages = data.mappings.map((mapping) => ({
        category_name: mapping.category_name,
        type: "link_bookmark_category" as const,
        url: mapping.url,
        user_id: userId,
      }));

      // Queue via pgmq.send_batch using service role client.
      const serviceClient = createServerServiceClient();
      const pgmqSupabase = serviceClient.schema("pgmq_public");
      const { data: queueResults, error: queueError } = await pgmqSupabase.rpc("send_batch", {
        messages: toJson(messages),
        queue_name: TWITTER_IMPORTS_QUEUE,
        sleep_seconds: 0,
      });

      if (queueError) {
        throw new RecollectApiError("service_unavailable", {
          cause: queueError,
          message: "Failed to queue category links",
          operation: "queue_category_links",
        });
      }

      const queuedCount = Array.isArray(queueResults) ? queueResults.length : 0;

      setPayload(ctx, {
        queued_count: queuedCount,
        queue_completed: true,
      });

      return { queued: queuedCount };
    },
    inputSchema: V2SyncFolderBookmarksInputSchema,
    outputSchema: V2SyncFolderBookmarksOutputSchema,
    route: ROUTE,
  }),
);
