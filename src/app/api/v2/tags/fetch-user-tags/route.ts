import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { TAG_TABLE_NAME } from "@/utils/constants";

import { FetchUserTagsInputSchema, FetchUserTagsOutputSchema } from "./schema";

const ROUTE = "v2-tags-fetch-user-tags";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }

      const { data, error } = await supabase.from(TAG_TABLE_NAME).select("*").eq("user_id", userId);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch user tags",
          operation: "tags_fetch",
        });
      }

      if (ctx?.fields) {
        ctx.fields.tag_count = data.length;
      }

      return data;
    },
    inputSchema: FetchUserTagsInputSchema,
    outputSchema: FetchUserTagsOutputSchema,
    route: ROUTE,
  }),
);
