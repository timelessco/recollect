/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const removeCategoryFromBookmarkSupplement = {
	path: "/category/remove-category-from-bookmark",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Remove a category from a bookmark",
	description:
		"Removes a category assignment from a bookmark. Cannot remove the Uncategorized (ID: 0) category — it is auto-managed by the system. When the last real category is removed, the bookmark is automatically assigned to Uncategorized. Returns 404 if the bookmark is not found or the category association does not exist. Returns 400 if attempting to remove the Uncategorized category.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		bookmark_id: 42,
		category_id: 7,
	},
	responseExample: {
		data: [{ bookmark_id: 42, category_id: 7 }],
		error: null,
	},
	additionalResponses: {
		400: { description: "Cannot manually remove the Uncategorized category" },
		404: {
			description: "Bookmark not found or category association not found",
		},
	},
} satisfies EndpointSupplement;
