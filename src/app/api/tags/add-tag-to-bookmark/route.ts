import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import {
	BOOKMARK_TAGS_TABLE_NAME,
	MAIN_TABLE_NAME,
	TAG_TABLE_NAME,
} from "@/utils/constants";

const ROUTE = "add-tag-to-bookmark";

export const AddTagToBookmarkPayloadSchema = z.object({
	bookmarkId: z.number(),
	tagId: z.number(),
});

export type AddTagToBookmarkPayload = z.infer<
	typeof AddTagToBookmarkPayloadSchema
>;

export const AddTagToBookmarkResponseSchema = z
	.array(
		z.object({
			id: z.number(),
			bookmark_id: z.number(),
			tag_id: z.number(),
			user_id: z.string().nullable(),
			created_at: z.string().nullable(),
		}),
	)
	.nonempty();

export type AddTagToBookmarkResponse = [
	z.infer<typeof AddTagToBookmarkResponseSchema>[number],
	...z.infer<typeof AddTagToBookmarkResponseSchema>,
];

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: AddTagToBookmarkPayloadSchema,
	outputSchema: AddTagToBookmarkResponseSchema,
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

		if (bookmarkData.user_id !== userId) {
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
					route,
					message: "Tag is already assigned to this bookmark",
					status: 409,
					context: { bookmarkId, tagId, userId },
				});
			}

			return apiError({
				route,
				message: "Error adding tag to bookmark",
				error,
				operation: "insert_bookmark_tag",
				userId,
				extra: { bookmarkId, tagId },
			});
		}

		if (!isNonEmptyArray(bookmarkTagData)) {
			return apiError({
				route,
				message: "No data returned from database",
				error: new Error("Empty insert result"),
				operation: "insert_bookmark_tag_empty",
				userId,
			});
		}

		console.log(`[${route}] Tag added to bookmark:`, {
			id: bookmarkTagData[0].id,
			bookmarkId,
			tagId,
		});

		return bookmarkTagData;
	},
});
