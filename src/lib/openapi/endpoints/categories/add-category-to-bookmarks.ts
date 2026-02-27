/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const addCategoryToBookmarksSupplement = {
	path: "/category/add-category-to-bookmarks",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Assign a category to multiple bookmarks",
	description:
		"Assigns a category to multiple bookmarks in a single atomic operation. All bookmarks must be owned by the caller. The caller must have access to the category (owner or collaborator with edit access). Accepts 1–100 bookmark IDs. Returns only the newly-created assignments (existing ones are skipped).",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		bookmark_ids: [42, 43, 44],
		category_id: 7,
	},
	responseExample: {
		data: [
			{ bookmark_id: 42, category_id: 7 },
			{ bookmark_id: 43, category_id: 7 },
			{ bookmark_id: 44, category_id: 7 },
		],
		error: null,
	},
	additionalResponses: {
		403: { description: "Bookmarks not owned or no category access" },
		404: { description: "Category not found" },
	},
} satisfies EndpointSupplement;
