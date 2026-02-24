/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const addCategoryToBookmarkSupplement = {
	path: "/category/add-category-to-bookmark",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Add a category to a bookmark",
	description:
		"Assigns a category to a single bookmark. The caller must own the bookmark and have access to the category (owner or collaborator with edit access). Use category_id: 0 to assign to the Uncategorized collection. Returns 404 if the bookmark or category is not found. Returns 403 if access is denied.",
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
		403: { description: "No edit access to this category" },
		404: { description: "Bookmark or category not found" },
	},
} satisfies EndpointSupplement;
