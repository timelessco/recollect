/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const setBookmarkCategoriesSupplement = {
	path: "/category/set-bookmark-categories",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Replace all categories on a bookmark",
	description:
		"Atomically replaces all category assignments for a bookmark. All existing assignments are removed and replaced with the provided list. The caller must own the bookmark and have access to all specified categories. Maximum 100 category IDs. No duplicate IDs allowed. Triggers revalidation for all affected public categories (old and new).",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		bookmark_id: 42,
		category_ids: [7, 8, 9],
	},
	responseExample: {
		data: [
			{ bookmark_id: 42, category_id: 7 },
			{ bookmark_id: 42, category_id: 8 },
			{ bookmark_id: 42, category_id: 9 },
		],
		error: null,
	},
	additionalResponses: {
		400: {
			description:
				"Invalid request: invalid bookmark_id, max 100 category IDs, or duplicate IDs",
		},
		403: {
			description: "Bookmark not owned or no access to specified categories",
		},
		404: { description: "Bookmark not found" },
	},
} satisfies EndpointSupplement;
