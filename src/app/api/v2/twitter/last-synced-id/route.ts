import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { TwitterLastSyncedIdInputSchema, TwitterLastSyncedIdOutputSchema } from "./schema";

const ROUTE = "v2-twitter-last-synced-id";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.last_synced_twitter_id = data.last_synced_twitter_id;
      }

      const { data: profile, error: dbError } = await supabase
        .from(PROFILES)
        .update({ last_synced_twitter_id: data.last_synced_twitter_id })
        .match({ id: user.id })
        .select("last_synced_twitter_id")
        .single();

      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to update last synced Twitter ID",
          operation: "update_last_synced_twitter_id",
        });
      }

      setPayload(ctx, { profile_updated: true });

      return { last_synced_twitter_id: profile.last_synced_twitter_id };
    },
    inputSchema: TwitterLastSyncedIdInputSchema,
    outputSchema: TwitterLastSyncedIdOutputSchema,
    route: ROUTE,
  }),
);
