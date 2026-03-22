import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

import {
  TwitterSyncRetryInputSchema as RetryInputSchema,
  TwitterSyncRetryOutputSchema as RetryOutputSchema,
} from "./schema";

const ROUTE = "twitter-sync-retry";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    console.log(`[${route}] API called:`, { data, userId: user.id });

    if ("msg_ids" in data) {
      console.log(`[${route}] Taking per-message path:`, {
        msgIds: data.msg_ids,
      });
      const { data: result, error } = await supabase.rpc("retry_twitter_import", {
        p_msg_ids: data.msg_ids,
        p_user_id: user.id,
      });

      if (error) {
        console.error(`[${route}] Retry error:`, error);
        return apiError({
          error,
          message: "Failed to retry imports",
          operation: "retry_imports",
          route,
          userId: user.id,
        });
      }

      return result;
    }

    console.log(`[${route}] Taking retry-all path`);
    const { data: result, error } = await supabase.rpc("retry_all_twitter_imports", {
      p_user_id: user.id,
    });

    if (error) {
      console.error(`[${route}] Retry all error:`, error);
      return apiError({
        error,
        message: "Failed to retry all imports",
        operation: "retry_all_imports",
        route,
        userId: user.id,
      });
    }

    return result;
  },
  inputSchema: RetryInputSchema,
  outputSchema: RetryOutputSchema,
  route: ROUTE,
});
