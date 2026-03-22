import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

// Called by: Chrome extension (recollect-chrome-extension) for bulk bookmark import
import { BookmarksInsertInputSchema, BookmarksInsertOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-insert";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const userId = user.id;

    console.log(`[${route}] API called:`, {
      bookmarkCount: data.data.length,
      userId,
    });

    const insertData = data.data.map((item) => ({
      ...item,
      user_id: userId,
    }));

    const { data: inserted, error } = await supabase
      .from(MAIN_TABLE_NAME)
      .insert(insertData)
      .select("id");

    if (error) {
      return apiError({
        error,
        extra: { bookmarkCount: data.data.length },
        message: "Failed to insert bookmarks",
        operation: "insert_bookmarks",
        route,
        userId,
      });
    }

    return { insertedCount: inserted.length };
  },
  inputSchema: BookmarksInsertInputSchema,
  outputSchema: BookmarksInsertOutputSchema,
  route: ROUTE,
});
