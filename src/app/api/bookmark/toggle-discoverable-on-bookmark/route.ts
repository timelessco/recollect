import {
	ToggleBookmarkDiscoverablePayloadSchema,
	ToggleBookmarkDiscoverableResponseSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import { MAIN_TABLE_NAME } from "@/utils/constants";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "toggle-discoverable-on-bookmark";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: ToggleBookmarkDiscoverablePayloadSchema,
	outputSchema: ToggleBookmarkDiscoverableResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { bookmark_id: bookmarkId, make_discoverable: makeDiscoverable } =
			data;
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkId,
			makeDiscoverable,
		});

		// Build match conditions - atomic update prevents TOCTOU race condition
		const matchConditions: Record<string, unknown> = {
			id: bookmarkId,
			user_id: userId,
		};

		// Build the update query
		let updateQuery = supabase
			.from(MAIN_TABLE_NAME)
			.update({
				make_discoverable: makeDiscoverable ? new Date().toISOString() : null,
			})
			.match(matchConditions);

		// Only require trash IS NULL when making discoverable (removing discoverability is always safe)
		if (makeDiscoverable) {
			updateQuery = updateQuery.is("trash", null);
		}

		const { data: updatedData, error } = await updateQuery.select();

		if (error) {
			return apiError({
				route,
				message: "Failed to toggle bookmark discoverable status",
				error,
				operation: "toggle_discoverable_on_bookmark",
				userId,
				extra: {
					bookmarkId,
					makeDiscoverable,
				},
			});
		}

		if (!isNonEmptyArray(updatedData)) {
			return apiWarn({
				route,
				message: makeDiscoverable
					? "Bookmark not found, you lack permission, or bookmark is trashed"
					: "Bookmark not found or you lack permission",
				status: HttpStatus.BAD_REQUEST,
				context: {
					bookmarkId,
					userId,
				},
			});
		}

		console.log(
			`[${route}] Bookmark discoverable status toggled successfully:`,
			{
				bookmarkId: updatedData[0].id,
				makeDiscoverable,
			},
		);

		return updatedData[0];
	},
});
