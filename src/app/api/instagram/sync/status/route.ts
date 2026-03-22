import { z } from "zod";

import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

import { InstagramSyncStatusOutputSchema } from "./schema";

const ROUTE = "instagram-sync-status";

const StatusInputSchema = z.object({});

export const GET = createGetApiHandlerWithAuth({
  handler: async ({ route, supabase, user }) => {
    const { data, error } = await supabase.rpc("get_instagram_sync_status", {
      p_user_id: user.id,
    });

    if (error) {
      console.error(`[${route}] Status error:`, error);
      return apiError({
        error,
        message: "Failed to get sync status",
        operation: "get_status",
        route,
        userId: user.id,
      });
    }

    return data;
  },
  inputSchema: StatusInputSchema,
  outputSchema: InstagramSyncStatusOutputSchema,
  route: ROUTE,
});
