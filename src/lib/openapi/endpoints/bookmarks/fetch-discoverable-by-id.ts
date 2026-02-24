/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const fetchDiscoverableByIdSupplement = {
	path: "/bookmark/fetch-discoverable-by-id",
	method: "get",
	tags: ["Bookmarks"],
	summary: "Get a single discoverable bookmark",
	description:
		"Fetches a single discoverable bookmark by ID, including its tags and categories. No authentication required. Returns 404 if the bookmark does not exist or is not discoverable.",
	responseExample: {
		data: {
			id: 101,
			inserted_at: "2024-03-15T10:30:00Z",
			title: "OpenAI Research Blog",
			url: "https://openai.com/research",
			description: "The latest AI research from OpenAI",
			ogImage: "https://openai.com/og.png",
			screenshot: null,
			category_id: 7,
			trash: null,
			type: "article",
			meta_data: null,
			sort_index: "a0",
			make_discoverable: "2024-03-15T12:00:00Z",
			addedTags: [{ id: 3, name: "ai" }],
			addedCategories: [
				{
					id: 7,
					category_name: "AI Research",
					category_slug: "ai-research",
					icon: "brain",
					icon_color: "#6366f1",
				},
			],
		},
		error: null,
	},
	additionalResponses: {
		404: { description: "Bookmark not found or not discoverable" },
		500: { description: "Server error" },
	},
} satisfies EndpointSupplement;
