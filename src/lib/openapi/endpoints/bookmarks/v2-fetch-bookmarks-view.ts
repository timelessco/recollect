/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchBookmarksViewSupplement = {
	path: "/v2/bookmark/fetch-bookmarks-view",
	method: "get",
	tags: ["Bookmarks"],
	summary: "Fetch bookmark view settings for a category",
	description:
		"Returns the category_views column for the given category_id, scoped to the authenticated user. Pass category_id as a query parameter.",
	security: [{ [bearerAuth.name]: [] }, {}],
	additionalResponses: {
		401: { description: "Not authenticated" },
	},
	parameterExamples: {
		category_id: {
			"with-view-data": {
				summary: "Category with view settings",
				description:
					"Send `?category_id=724` (substitute a real category ID) — returns the category_views object.",
				value: "724",
			},
			"nonexistent-category": {
				summary: "Nonexistent category ID",
				description:
					"Send `?category_id=999999` — returns an empty data array.",
				value: "999999",
			},
		},
	},
	responseExamples: {
		"with-view-data": {
			summary: "Category with view settings",
			description:
				"Send `?category_id=724` (substitute a real category ID) — returns the category_views JSON object.",
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
			description: "Category with no view settings — category_views is null.",
			value: {
				data: [{ category_views: null }],
				error: null,
			} as const,
		},
		"nonexistent-category": {
			summary: "Nonexistent category ID",
			description: "Send `?category_id=999999` — returns an empty data array.",
			value: {
				data: [],
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"missing-category-id": {
			summary: "Missing category_id",
			description: "Omit the `category_id` query parameter — returns 400.",
			value: {
				data: null,
				error: "Invalid input: expected number, received nan",
			} as const,
		},
		"invalid-category-id-type": {
			summary: "Invalid category_id type",
			description: "Send `?category_id=abc` — returns 400: expected number.",
			value: {
				data: null,
				error: "Invalid input: expected number, received nan",
			} as const,
		},
	},
} satisfies EndpointSupplement;
