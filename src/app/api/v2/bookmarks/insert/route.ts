import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { MAIN_TABLE_NAME } from "@/utils/constants";

// Called by: Chrome extension (recollect-chrome-extension) for bulk bookmark import
import { BookmarksInsertInputSchema, BookmarksInsertOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-insert";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }
      setPayload(ctx, { input_count: data.data.length });

      const insertData = data.data.map((item) => ({
        ...item,
        user_id: userId,
      }));

      const { data: inserted, error } = await supabase
        .from(MAIN_TABLE_NAME)
        .insert(insertData)
        .select("id");

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to insert bookmarks",
          operation: "insert_bookmarks",
        });
      }

      setPayload(ctx, { bookmark_count: inserted.length });

      return { insertedCount: inserted.length };
    },
    inputSchema: BookmarksInsertInputSchema,
    outputSchema: BookmarksInsertOutputSchema,
    route: ROUTE,
  }),
);
