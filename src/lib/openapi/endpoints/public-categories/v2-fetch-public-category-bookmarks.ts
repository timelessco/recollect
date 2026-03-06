/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2FetchPublicCategoryBookmarksSupplement = {
	path: "/v2/fetch-public-category-bookmarks",
	method: "get",
	tags: ["Bookmarks"],
	summary: "Fetch bookmarks in a public category by slug and username",
	description:
		"Returns paginated bookmarks for a public category, along with category metadata (name, icon, views, public status). Uses a service-role client to bypass RLS. Does NOT gate on `is_public` -- the frontend decides how to handle non-public categories. Public endpoint (no auth required).",
	security: [],
	responseExample: {
		data: {
			bookmarks: [],
			categoryName: "Design Inspiration",
			categoryViews: { sortBy: "date-sort-ascending", bookmarksView: "card" },
			icon: "palette",
			iconColor: "#ff6800",
			isPublic: true,
		},
		error: null,
	},
	parameterExamples: {
		category_slug: {
			"valid-category": {
				summary: "Valid category slug",
				description: "Returns bookmarks for this category.",
				value: "design-inspiration",
			},
		},
		user_name: {
			"valid-user": {
				summary: "Valid username",
				description: "Category owner username.",
				value: "johndoe",
			},
		},
	},
} satisfies EndpointSupplement;
