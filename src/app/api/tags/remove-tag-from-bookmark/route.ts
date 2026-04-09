import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { BOOKMARK_TAGS_TABLE_NAME, MAIN_TABLE_NAME, TAG_TABLE_NAME } from "@/utils/constants";

import { RemoveTagFromBookmarkPayloadSchema, RemoveTagFromBookmarkResponseSchema } from "./schema";

const ROUTE = "remove-tag-from-bookmark";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { bookmarkId, tagId } = data;
    const userId = user.id;

    console.log(`[${route}] API called:`, { bookmarkId, tagId, userId });

    // Verify bookmark and tag ownership in parallel
    const [bookmarkResult, tagResult] = await Promise.all([
      supabase.from(MAIN_TABLE_NAME).select("user_id").eq("id", bookmarkId).single(),
      supabase.from(TAG_TABLE_NAME).select("user_id").eq("id", tagId).single(),
    ]);

    const { data: bookmarkData, error: bookmarkError } = bookmarkResult;
    const { data: tagData, error: tagError } = tagResult;

    if (bookmarkError) {
      return apiError({
        error: bookmarkError,
        extra: { bookmarkId },
        message: "Error verifying bookmark ownership",
        operation: "verify_bookmark_owner",
        route,
        userId,
      });
    }

    if (bookmarkData?.user_id !== userId) {
      return apiWarn({
        context: { bookmarkId, userId },
        message: "User is not the owner of the bookmark",
        route,
        status: 403,
      });
    }

    if (tagError) {
      return apiError({
        error: tagError,
        extra: { tagId },
        message: "Error verifying tag ownership",
        operation: "verify_tag_owner",
        route,
        userId,
      });
    }

    if (tagData?.user_id !== userId) {
      return apiWarn({
        context: { tagId, userId },
        message: "User is not the owner of the tag",
        route,
        status: 403,
      });
    }

    // Delete from bookmark_tags junction table
    const { data: deletedData, error } = await supabase
      .from(BOOKMARK_TAGS_TABLE_NAME)
      .delete()
      .eq("bookmark_id", bookmarkId)
      .eq("tag_id", tagId)
      .select();

    if (error) {
      return apiError({
        error,
        extra: { bookmarkId, tagId },
        message: "Error removing tag from bookmark",
        operation: "delete_bookmark_tag",
        route,
        userId,
      });
    }

    if (!isNonEmptyArray(deletedData)) {
      return apiWarn({
        context: { bookmarkId, tagId, userId },
        message: "Tag was not assigned to this bookmark",
        route,
        status: 404,
      });
    }

    console.log(`[${route}] Tag removed from bookmark:`, {
      bookmarkId,
      id: deletedData[0].id,
      tagId,
    });

    return deletedData;
  },
  inputSchema: RemoveTagFromBookmarkPayloadSchema,
  outputSchema: RemoveTagFromBookmarkResponseSchema,
  route: ROUTE,
});
