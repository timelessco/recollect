import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { BOOKMARK_CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "@/utils/constants";

import { FetchByIdInputSchema, FetchByIdOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-get-fetch-by-id";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;
      const bookmarkId = data.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_id = bookmarkId;
      }

      const { data: bookmarks, error: bookmarkError } = await supabase
        .from(MAIN_TABLE_NAME)
        .select("*")
        .eq("user_id", userId)
        .eq("id", bookmarkId);

      if (bookmarkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: bookmarkError,
          message: "Failed to fetch bookmark",
          operation: "bookmark_fetch_by_id",
        });
      }

      setPayload(ctx, { found: bookmarks.length > 0 });

      const { data: categoriesData, error: categoriesError } = await supabase
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .select("bookmark_id, category_id(id, category_name, category_slug, icon, icon_color)")
        .eq("bookmark_id", bookmarkId)
        .eq("user_id", userId);

      if (categoriesError) {
        throw new RecollectApiError("service_unavailable", {
          cause: categoriesError,
          message: "Failed to fetch bookmark categories",
          operation: "bookmark_fetch_by_id_categories",
        });
      }

      const addedCategories = categoriesData
        .filter((item) => item.category_id !== null)
        .map((item) => ({
          category_name: item.category_id.category_name,
          category_slug: item.category_id.category_slug,
          icon: item.category_id.icon,
          icon_color: item.category_id.icon_color,
          id: item.category_id.id,
        }));

      setPayload(ctx, { categories_count: addedCategories.length });

      return bookmarks.map((bookmark) => ({
        ...bookmark,
        addedCategories,
      }));
    },
    inputSchema: FetchByIdInputSchema,
    outputSchema: FetchByIdOutputSchema,
    route: ROUTE,
  }),
);
