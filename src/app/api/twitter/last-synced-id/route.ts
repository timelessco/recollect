import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";

const ROUTE = "twitter-last-synced-id";

const InputSchema = z.object({
  last_synced_twitter_id: z.string(),
});

const OutputSchema = z.object({
  last_synced_twitter_id: z.string(),
});

/**
 * @deprecated Use /api/v2/twitter/last-synced-id instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { data: profile, error } = await supabase
      .from(PROFILES)
      .update({ last_synced_twitter_id: data.last_synced_twitter_id })
      .match({ id: user.id })
      .select("last_synced_twitter_id")
      .single();

    if (error) {
      return apiError({
        error,
        message: "Failed to update last synced Twitter ID",
        operation: "update_last_synced_twitter_id",
        route,
        userId: user.id,
      });
    }

    return { last_synced_twitter_id: profile.last_synced_twitter_id };
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  route: ROUTE,
});
