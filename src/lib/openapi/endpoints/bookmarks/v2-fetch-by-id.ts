/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchByIdSupplement = {
	path: "/v2/bookmarks/get/fetch-by-id",
	method: "get",
	tags: ["Bookmarks"],
	summary: "Fetch a bookmark by ID with its categories",
	description:
		"Returns the bookmark with the given ID and its associated categories in the addedCategories array. The query is scoped to the authenticated user's bookmarks only.",
	security: [{ [bearerAuth.name]: [] }, {}],
	parameterExamples: {
		id: {
			"with-categories": {
				summary: "Bookmark with categories",
				description:
					"Returns the bookmark and its addedCategories array populated.",
				value: "86",
			},
			"no-categories": {
				summary: "Bookmark without categories",
				description:
					"Returns the bookmark with addedCategories as an empty array.",
				value: "90127",
			},
			nonexistent: {
				summary: "Nonexistent bookmark ID",
				description: "Returns an empty data array.",
				value: "999999",
			},
		},
	},
	responseExamples: {
		"with-categories": {
			summary: "Bookmark with categories",
			description:
				"Send `?id=86` (substitute a real bookmark ID) — returns bookmark with populated addedCategories.",
			value: {
				data: [
					{
						addedCategories: [
							{
								category_name: "Database",
								category_slug: "database-mhehjvu5",
								icon: "star-04",
								icon_color: "#000000",
								id: 577,
							},
						],
						category_id: 577,
						description: "GitHub is where over 100 million developers...",
						id: 86,
						inserted_at: "2023-10-30T11:49:24.887983+00:00",
						make_discoverable: null,
						meta_data: {
							width: 1200,
							height: 630,
							favIcon: "https://github.githubassets.com/favicons/favicon.svg",
						},
						ogImage: "https://example.com/storage/bookmarks/img-locu7pnd.jpg",
						screenshot: null,
						sort_index: null,
						title: "GitHub: Let's build from here",
						trash: null,
						type: "bookmark",
						url: "https://github.com/",
						user_id: "550e8400-e29b-41d4-a716-446655440000",
					},
				],
				error: null,
			} as const,
		},
		"no-categories": {
			summary: "Bookmark without categories",
			description:
				"Send `?id=90127` (substitute a bookmark with no categories) — addedCategories is an empty array.",
			value: {
				data: [
					{
						addedCategories: [],
						category_id: 0,
						description: null,
						id: 90127,
						inserted_at: "2026-02-26T07:33:01.467254+00:00",
						make_discoverable: null,
						meta_data: null,
						ogImage: null,
						screenshot: null,
						sort_index: null,
						title: "Test No Categories Bookmark",
						trash: null,
						type: null,
						url: "https://example.com/no-cats-test",
						user_id: "550e8400-e29b-41d4-a716-446655440000",
					},
				],
				error: null,
			} as const,
		},
		nonexistent: {
			summary: "Nonexistent bookmark ID",
			description:
				"Send `?id=999999` — returns empty array when no bookmark matches.",
			value: {
				data: [],
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		400: { description: "Missing or invalid bookmark ID query parameter" },
	},
	response400Examples: {
		"missing-id": {
			summary: "Missing id parameter",
			description: "Omit the `id` query parameter entirely — returns 400.",
			value: {
				data: null,
				error: "Invalid input: expected number, received NaN",
			} as const,
		},
		"non-numeric-id": {
			summary: "Non-numeric id parameter",
			description: "Send `?id=abc` — returns 400 validation error.",
			value: {
				data: null,
				error: "Invalid input: expected number, received NaN",
			} as const,
		},
	},
} satisfies EndpointSupplement;
