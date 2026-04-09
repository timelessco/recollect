import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { CATEGORIES_TABLE_NAME } from "@/utils/constants";

import { FetchBookmarksViewInputSchema, FetchBookmarksViewOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-fetch-bookmarks-view";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const { category_id } = data;
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.category_id = category_id;
      }

      const { data: viewData, error } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .select("category_views")
        .eq("id", category_id)
        .eq("user_id", userId);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to fetch bookmarks view",
          operation: "bookmarks_view_fetch",
        });
      }

      if (ctx?.fields) {
        ctx.fields.bookmarks_returned = viewData?.length ?? 0;
      }

      return viewData;
    },
    inputSchema: FetchBookmarksViewInputSchema,
    outputSchema: FetchBookmarksViewOutputSchema,
    route: ROUTE,
  }),
);
