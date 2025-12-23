import { isEmpty } from "lodash";
import { z } from "zod";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { type SingleListData } from "@/types/apiTypes";
import { isNullable } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME } from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "toggle-discoverable-on-bookmark";

const UpdateBookmarkDiscoverablePayloadSchema = z.object({
	bookmark_id: z
		.number({
			error: (issue) =>
				isNullable(issue.input)
					? "Bookmark ID is required"
					: "Bookmark ID must be a number",
		})
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" }),
	make_discoverable: z.boolean({
		error: (issue) =>
			isNullable(issue.input)
				? "make_discoverable is required"
				: "make_discoverable must be a boolean",
	}),
});

export type UpdateBookmarkDiscoverablePayload = z.infer<
	typeof UpdateBookmarkDiscoverablePayloadSchema
>;

// Response schema - validates array of bookmark objects
// Using z.any() for complex nested types (user_id, meta_data, etc.) as they're validated by TypeScript
const UpdateBookmarkDiscoverableResponseSchema = z.array(z.any());

export type UpdateBookmarkDiscoverableResponse = z.infer<
	typeof UpdateBookmarkDiscoverableResponseSchema
>;

export const POST = createSupabasePostApiHandler({
	route: ROUTE,
	inputSchema: UpdateBookmarkDiscoverablePayloadSchema,
	outputSchema: UpdateBookmarkDiscoverableResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmark_id: bookmarkId, make_discoverable: makeDiscoverable } =
			data;
		const userId = user.id;

		// Entry point log
		console.log(`[${route}] API called:`, {
			userId,
			bookmarkId,
			makeDiscoverable,
		});

		const { data: updatedData, error } = await supabase
			.from(MAIN_TABLE_NAME)
			.update({
				make_discoverable: makeDiscoverable ? new Date().toISOString() : null,
			})
			.match({ id: bookmarkId, user_id: userId })
			.select();

		if (error) {
			return apiError({
				route,
				message: "Failed to update bookmark discoverable status",
				error,
				operation: "toggle_discoverable_on_bookmark",
				userId,
				extra: {
					bookmarkId,
					makeDiscoverable,
				},
			});
		}

		if (isEmpty(updatedData)) {
			return apiWarn({
				route,
				message: "Bookmark not found or you lack permission",
				status: HttpStatus.NOT_FOUND,
				context: {
					bookmarkId,
					userId,
				},
			});
		}

		console.log(
			`[${route}] Bookmark discoverable status updated successfully:`,
			{
				bookmarkId: updatedData?.[0]?.id,
				makeDiscoverable,
			},
		);

		return updatedData as unknown as SingleListData[];
	},
});
