import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import {
  FetchSharedCategoriesDataInputSchema,
  FetchSharedCategoriesDataOutputSchema,
} from "./schema";

const ROUTE = "v2-share-fetch-shared-categories-data";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const { email, id: userId } = user;

      if (!email) {
        throw new RecollectApiError("bad_request", {
          message: "User email not available",
        });
      }

      const { data, error } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .select()
        .or(`email.eq.${email},user_id.eq.${userId}`);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch shared categories",
          operation: "shared_categories_fetch",
        });
      }

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.share_count = data.length;
      }

      return data;
    },
    inputSchema: FetchSharedCategoriesDataInputSchema,
    outputSchema: FetchSharedCategoriesDataOutputSchema,
    route: ROUTE,
  }),
);
