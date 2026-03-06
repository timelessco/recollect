import {
	RemoveTagFromBookmarkPayloadSchema,
	RemoveTagFromBookmarkResponseSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	MAIN_TABLE_NAME,
	TAG_TABLE_NAME,
} from "@/utils/constants";

const ROUTE = "remove-tag-from-bookmark";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: RemoveTagFromBookmarkPayloadSchema,
	outputSchema: RemoveTagFromBookmarkResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmarkId, tagId } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId, bookmarkId, tagId });

		// Verify bookmark and tag ownership in parallel
		const [bookmarkResult, tagResult] = await Promise.all([
			supabase
				.from(MAIN_TABLE_NAME)
				.select("user_id")
				.eq("id", bookmarkId)
				.single(),
			supabase.from(TAG_TABLE_NAME).select("user_id").eq("id", tagId).single(),
		]);

		const { data: bookmarkData, error: bookmarkError } = bookmarkResult;
		const { data: tagData, error: tagError } = tagResult;

		if (bookmarkError) {
			return apiError({
				route,
				message: "Error verifying bookmark ownership",
				error: bookmarkError,
				operation: "verify_bookmark_owner",
				userId,
				extra: { bookmarkId },
			});
		}

		if (bookmarkData?.user_id !== userId) {
			return apiWarn({
				route,
				message: "User is not the owner of the bookmark",
				status: 403,
				context: { bookmarkId, userId },
			});
		}

		if (tagError) {
			return apiError({
				route,
				message: "Error verifying tag ownership",
				error: tagError,
				operation: "verify_tag_owner",
				userId,
				extra: { tagId },
			});
		}

		if (tagData?.user_id !== userId) {
			return apiWarn({
				route,
				message: "User is not the owner of the tag",
				status: 403,
				context: { tagId, userId },
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
				route,
				message: "Error removing tag from bookmark",
				error,
				operation: "delete_bookmark_tag",
				userId,
				extra: { bookmarkId, tagId },
			});
		}

		if (!isNonEmptyArray(deletedData)) {
			return apiWarn({
				route,
				message: "Tag was not assigned to this bookmark",
				status: 404,
				context: { bookmarkId, tagId, userId },
			});
		}

		console.log(`[${route}] Tag removed from bookmark:`, {
			id: deletedData[0].id,
			bookmarkId,
			tagId,
		});

		return deletedData;
	},
});
