/**
 * @module Build-time only
 */
import {
	FetchDiscoverableByIdQuerySchema,
	FetchDiscoverableByIdResponseSchema,
} from "@/app/api/bookmark/fetch-discoverable-by-id/schema";
import { registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerBookmarksFetchDiscoverableById() {
	registry.registerPath({
		method: "get",
		path: "/bookmark/fetch-discoverable-by-id",
		tags: ["bookmarks"],
		summary: "Get a single discoverable bookmark",
		description:
			"Fetches a single discoverable bookmark by ID, including its tags, categories, and owner profile. " +
			"No authentication required. Returns 404 if the bookmark does not exist or is not discoverable.",
		request: {
			query: FetchDiscoverableByIdQuerySchema,
		},
		responses: {
			200: {
				description: "Discoverable bookmark with tags, categories, and profile",
				content: {
					"application/json": {
						schema: apiResponseSchema(FetchDiscoverableByIdResponseSchema),
						example: {
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
								user_id: {
									bookmarks_view: {},
									category_order: [7, 8],
									display_name: "Jane Doe",
									id: "usr_abc123",
									preferred_og_domains: null,
									profile_pic: "https://example.com/avatar.jpg",
									user_name: "janedoe",
								},
							},
							error: null,
						},
					},
				},
			},
			404: { description: "Bookmark not found or not discoverable" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
