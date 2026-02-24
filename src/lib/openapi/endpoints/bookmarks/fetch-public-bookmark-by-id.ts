/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const fetchPublicBookmarkByIdSupplement = {
	path: "/bookmark/fetch-public-bookmark-by-id",
	method: "get",
	tags: ["Bookmarks"],
	summary: "Get a public bookmark by ID and collection",
	description:
		"Fetches a single bookmark by ID, verifying it belongs to a public category owned by the given username. No authentication required. Returns 404 if the category doesn't exist, the username doesn't match, or the bookmark isn't in the specified category. Returns 403 if the category is private.",
	responseExample: {
		data: {
			id: 42,
			inserted_at: "2024-03-15T10:30:00Z",
			title: "TypeScript Handbook",
			url: "https://www.typescriptlang.org/docs/",
			description: "Official TypeScript documentation",
			ogImage: "https://www.typescriptlang.org/og.png",
			screenshot: null,
			trash: null,
			type: "article",
			meta_data: null,
			make_discoverable: null,
			user_id: { user_name: "johndoe" },
		},
		error: null,
	},
	additionalResponses: {
		403: { description: "Category is not public" },
		404: { description: "Category or bookmark not found" },
		500: { description: "Server error" },
	},
} satisfies EndpointSupplement;
