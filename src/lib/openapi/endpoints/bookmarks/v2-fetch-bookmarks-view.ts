/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchBookmarksViewSupplement = {
	path: "/v2/bookmark/fetch-bookmarks-view",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Fetch bookmark view settings for a category",
	description:
		"Returns the category_views column for the given category_id, scoped to the authenticated user. Reclassified from GET to POST because the original route read category_id from the request body.",
	security: [{ [bearerAuth.name]: [] }, {}],
	additionalResponses: {
		401: { description: "Not authenticated" },
		405: { description: "Method not allowed (only POST is accepted)" },
	},
	requestExamples: {
		"with-view-data": {
			summary: "Category with view settings",
			description:
				"Send the shown body with a valid category_id — returns the category_views object.",
			value: { category_id: 724 },
		},
		"nonexistent-category": {
			summary: "Nonexistent category ID",
			description:
				"Send a category_id that does not exist — returns an empty array.",
			value: { category_id: 999999 },
		},
	},
	responseExamples: {
		"with-view-data": {
			summary: "Category with view settings",
			description:
				"Send `{ category_id: 724 }` (substitute a real category ID) — returns the category_views JSON object.",
			value: {
				data: [
					{
						category_views: {
							moodboardColumns: [30],
							cardContentViewArray: ["cover", "title", "info"],
							bookmarksView: "moodboard",
							sortBy: "date-sort-ascending",
						},
					},
				],
				error: null,
			} as const,
		},
		"null-views": {
			summary: "Category with null view settings",
			description:
				"Send a category_id for a category with no view settings — category_views is null.",
			value: {
				data: [{ category_views: null }],
				error: null,
			} as const,
		},
		"nonexistent-category": {
			summary: "Nonexistent category ID",
			description:
				"Send `{ category_id: 999999 }` — returns an empty data array.",
			value: {
				data: [],
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"missing-category-id": {
			summary: "Missing category_id",
			description: "Send `{}` as body — returns 400: category_id is required.",
			value: {
				data: null,
				error: "Invalid input: expected number, received undefined",
			} as const,
		},
		"invalid-category-id-type": {
			summary: "Invalid category_id type",
			description:
				'Send `{ "category_id": "abc" }` — returns 400: expected number.',
			value: {
				data: null,
				error: "Invalid input: expected number, received string",
			} as const,
		},
	},
} satisfies EndpointSupplement;
