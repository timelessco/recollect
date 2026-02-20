/**
 * @module Build-time only
 */
import {
	FetchDiscoverBookmarksQuerySchema,
	FetchDiscoverBookmarksResponseSchema,
} from "@/app/api/bookmark/fetch-bookmarks-discoverable/schema";
import { registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerBookmarksFetchBookmarksDiscoverable() {
	registry.registerPath({
		method: "get",
		path: "/bookmark/fetch-bookmarks-discoverable",
		tags: ["Bookmarks"],
		summary: "List discoverable bookmarks",
		description:
			"Returns a paginated list of all bookmarks marked as discoverable across all users. No authentication required. Results are ordered by make_discoverable timestamp ascending. Page size is fixed at the server's PAGINATION_LIMIT (typically 20 items).",
		request: {
			query: FetchDiscoverBookmarksQuerySchema,
		},
		responses: {
			200: {
				description: "Paginated list of discoverable bookmarks",
				content: {
					"application/json": {
						schema: apiResponseSchema(FetchDiscoverBookmarksResponseSchema),
						example: {
							data: [
								{
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
								},
							],
							error: null,
						},
					},
				},
			},
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
