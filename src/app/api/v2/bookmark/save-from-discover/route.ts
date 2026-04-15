import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { BOOKMARK_CATEGORIES_TABLE_NAME, bookmarkType, MAIN_TABLE_NAME } from "@/utils/constants";

import { SaveFromDiscoverInputSchema, SaveFromDiscoverOutputSchema } from "./schema";

const ROUTE = "v2-bookmark-save-from-discover";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      // Wide event: entity context BEFORE operations
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.source_bookmark_id = data.source_bookmark_id;
        ctx.fields.category_ids_count = data.category_ids.length;
      }

      // Fetch source bookmark via service client (RLS bypass — another user's bookmark)
      const serviceClient = createServerServiceClient();
      const { data: sourceBookmark, error: fetchError } = await serviceClient
        .from(MAIN_TABLE_NAME)
        .select("url, title, description, ogImage, meta_data")
        .eq("id", data.source_bookmark_id)
        .not("make_discoverable", "is", null)
        .single();

      if (fetchError || !sourceBookmark) {
        throw new RecollectApiError("not_found", {
          cause: fetchError ?? undefined,
          message: "Source bookmark not found or not discoverable",
          operation: "fetch_source_bookmark",
        });
      }

      // Insert new bookmark cloning enriched fields, fresh timestamps
      const { data: insertedData, error: insertError } = await supabase
        .from(MAIN_TABLE_NAME)
        .insert([
          {
            description: sourceBookmark.description,
            meta_data: sourceBookmark.meta_data,
            ogImage: sourceBookmark.ogImage,
            title: sourceBookmark.title,
            type: bookmarkType,
            url: sourceBookmark.url,
            user_id: userId,
          },
        ])
        .select();

      if (insertError) {
        if (insertError.code === "23505") {
          throw new RecollectApiError("conflict", {
            cause: insertError,
            message: "This bookmark is already in your library",
            operation: "insert_bookmark",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Failed to save bookmark",
          operation: "insert_bookmark",
        });
      }

      if (!insertedData || insertedData.length === 0) {
        throw new RecollectApiError("service_unavailable", {
          message: "Failed to save bookmark",
          operation: "insert_bookmark",
        });
      }

      const [insertedBookmark] = insertedData;

      if (ctx?.fields) {
        ctx.fields.bookmark_id = insertedBookmark.id;
        ctx.fields.bookmark_saved = true;
      }

      // Insert junction table entries for each selected collection
      const junctionRows = data.category_ids.map((categoryId) => ({
        bookmark_id: insertedBookmark.id,
        category_id: categoryId,
        user_id: userId,
      }));

      const { error: junctionError } = await supabase
        .from(BOOKMARK_CATEGORIES_TABLE_NAME)
        .insert(junctionRows);

      if (junctionError && ctx?.fields) {
        ctx.fields.junction_error = true;
        ctx.fields.junction_error_code = junctionError.code;
      }

      return insertedData;
    },
    inputSchema: SaveFromDiscoverInputSchema,
    outputSchema: SaveFromDiscoverOutputSchema,
    route: ROUTE,
  }),
);
