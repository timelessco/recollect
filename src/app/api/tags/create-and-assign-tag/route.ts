import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import { isNonEmptyArray } from "@/utils/assertion-utils";

const ROUTE = "create-and-assign-tag";

const CreateAndAssignTagPayloadSchema = z.object({
	name: tagCategoryNameSchema,
	bookmarkId: z.number(),
});

export type CreateAndAssignTagPayload = z.infer<
	typeof CreateAndAssignTagPayloadSchema
>;

const TagSchema = z.object({
	id: z.number(),
	name: z.string().nullable(),
	user_id: z.string().nullable(),
	created_at: z.string().nullable(),
});

const BookmarkTagSchema = z.object({
	id: z.number(),
	bookmark_id: z.number(),
	tag_id: z.number(),
	user_id: z.string().nullable(),
	created_at: z.string().nullable(),
});

const CreateAndAssignTagResponseSchema = z.object({
	tag: TagSchema,
	bookmarkTag: BookmarkTagSchema,
});

export type CreateAndAssignTagResponse = z.infer<
	typeof CreateAndAssignTagResponseSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: CreateAndAssignTagPayloadSchema,
	outputSchema: CreateAndAssignTagResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { name, bookmarkId } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId, name, bookmarkId });

		// Single atomic RPC call that:
		// 1. Verifies bookmark ownership (with FOR UPDATE lock)
		// 2. Creates the tag
		// 3. Assigns tag to bookmark
		// All operations succeed or all fail (PostgreSQL transaction)
		const { data: rpcData, error: rpcError } = await supabase.rpc(
			"create_and_assign_tag",
			{
				p_bookmark_id: bookmarkId,
				p_tag_name: name,
			},
		);

		if (rpcError) {
			// Handle specific error codes
			if (rpcError.code === "42501") {
				// insufficient_privilege - bookmark not owned by user
				return apiWarn({
					route,
					message: "Bookmark not found or not owned by user",
					status: 403,
					context: { bookmarkId, userId },
				});
			}

			if (rpcError.code === "23505") {
				// unique_violation (23505) - duplicate tag name
				return apiWarn({
					route,
					message:
						"You already have a tag with this name, please use a different name",
					status: 409,
					context: { name, userId },
				});
			}

			return apiError({
				route,
				message: "Error creating and assigning tag",
				error: rpcError,
				operation: "create_and_assign_tag_rpc",
				userId,
				extra: { bookmarkId, name },
			});
		}

		if (!isNonEmptyArray(rpcData)) {
			return apiError({
				route,
				message: "No data returned from create_and_assign_tag RPC",
				error: new Error("Empty RPC result"),
				operation: "create_and_assign_tag_empty",
				userId,
			});
		}

		const rpcRow = rpcData[0];

		console.log(`[${route}] Tag created and assigned:`, {
			tagId: rpcRow.tag_id,
			tagName: rpcRow.tag_name,
			bookmarkTagId: rpcRow.bookmark_tag_id,
			bookmarkId: rpcRow.bookmark_tag_bookmark_id,
		});

		return {
			tag: {
				id: rpcRow.tag_id,
				name: rpcRow.tag_name,
				user_id: rpcRow.tag_user_id,
				created_at: rpcRow.tag_created_at,
			},
			bookmarkTag: {
				id: rpcRow.bookmark_tag_id,
				bookmark_id: rpcRow.bookmark_tag_bookmark_id,
				tag_id: rpcRow.bookmark_tag_tag_id,
				user_id: rpcRow.bookmark_tag_user_id,
				created_at: rpcRow.bookmark_tag_created_at,
			},
		};
	},
});
