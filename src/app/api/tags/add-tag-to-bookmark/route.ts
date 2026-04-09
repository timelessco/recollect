import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { BOOKMARK_TAGS_TABLE_NAME, MAIN_TABLE_NAME, TAG_TABLE_NAME } from "@/utils/constants";

import { AddTagToBookmarkPayloadSchema, AddTagToBookmarkResponseSchema } from "./schema";

const ROUTE = "add-tag-to-bookmark";

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

    if (bookmarkData.user_id !== userId) {
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

    // Insert into bookmark_tags junction table
    const { data: bookmarkTagData, error } = await supabase
      .from(BOOKMARK_TAGS_TABLE_NAME)
      .insert({
        bookmark_id: bookmarkId,
        tag_id: tagId,
        user_id: userId,
      })
      .select();

    if (error) {
      // Handle duplicate entry (tag already assigned to bookmark)
      if (error.code === "23505") {
        return apiWarn({
          context: { bookmarkId, tagId, userId },
          message: "Tag is already assigned to this bookmark",
          route,
          status: 409,
        });
      }

      return apiError({
        error,
        extra: { bookmarkId, tagId },
        message: "Error adding tag to bookmark",
        operation: "insert_bookmark_tag",
        route,
        userId,
      });
    }

    if (!isNonEmptyArray(bookmarkTagData)) {
      return apiError({
        error: new Error("Empty insert result"),
        message: "No data returned from database",
        operation: "insert_bookmark_tag_empty",
        route,
        userId,
      });
    }

    console.log(`[${route}] Tag added to bookmark:`, {
      bookmarkId,
      id: bookmarkTagData[0].id,
      tagId,
    });

    return bookmarkTagData;
  },
  inputSchema: AddTagToBookmarkPayloadSchema,
  outputSchema: AddTagToBookmarkResponseSchema,
  route: ROUTE,
});
