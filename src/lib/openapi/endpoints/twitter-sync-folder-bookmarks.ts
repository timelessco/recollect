/**
 * @module Build-time only
 */
import {
	SyncFolderBookmarksInputSchema,
	SyncFolderBookmarksOutputSchema,
} from "@/app/api/twitter/sync-folder-bookmarks/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTwitterSyncFolderBookmarks() {
	registry.registerPath({
		method: "post",
		path: "/twitter/sync-folder-bookmarks",
		tags: ["Twitter"],
		summary: "Link Twitter bookmarks to their folders",
		description:
			"Queues bookmark-to-collection mapping messages. " +
			"Used after sync-folders to associate imported Twitter bookmarks with their respective collections. " +
			"Returns the count of successfully queued mappings.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: SyncFolderBookmarksInputSchema,
						example: {
							mappings: [
								{
									url: "https://twitter.com/user/status/1234567890",
									category_name: "Tech Articles",
								},
								{
									url: "https://twitter.com/user/status/9876543210",
									category_name: "Design Inspiration",
								},
							],
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Mappings successfully queued",
				content: {
					"application/json": {
						schema: apiResponseSchema(SyncFolderBookmarksOutputSchema),
						example: {
							data: { queued: 2 },
							error: null,
						},
					},
				},
			},
			400: { description: "Invalid request body or mapping data" },
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
