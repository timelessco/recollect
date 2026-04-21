import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { PROFILES } from "@/utils/constants";

import { InstagramLastSyncedIdInputSchema, InstagramLastSyncedIdOutputSchema } from "./schema";

const ROUTE = "v2-instagram-last-synced-id";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.last_synced_instagram_id = data.last_synced_instagram_id;
      }

      const { data: profile, error: dbError } = await supabase
        .from(PROFILES)
        .update({ last_synced_instagram_id: data.last_synced_instagram_id })
        .match({ id: user.id })
        .select("last_synced_instagram_id")
        .single();

      if (dbError) {
        throw new RecollectApiError("service_unavailable", {
          cause: dbError,
          message: "Failed to update last synced Instagram ID",
          operation: "update_last_synced_instagram_id",
        });
      }

      setPayload(ctx, { profile_updated: true });

      return { last_synced_instagram_id: profile.last_synced_instagram_id };
    },
    inputSchema: InstagramLastSyncedIdInputSchema,
    outputSchema: InstagramLastSyncedIdOutputSchema,
    route: ROUTE,
  }),
);
