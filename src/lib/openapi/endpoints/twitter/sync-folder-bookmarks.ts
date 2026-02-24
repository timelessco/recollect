/**
 * @module Build-time only
 */
import { z } from "zod";

import {
	SyncFolderBookmarksInputSchema,
	SyncFolderBookmarksOutputSchema,
} from "@/app/api/twitter/sync-folder-bookmarks/schema";
import {
	twitterSyncFolderBookmarksRequestExamples,
	twitterSyncFolderBookmarksResponse200Examples,
	twitterSyncFolderBookmarksResponse400Examples,
} from "./sync-folder-bookmarks-examples";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTwitterSyncFolderBookmarks() {
	registry.registerPath({
		method: "post",
		path: "/twitter/sync-folder-bookmarks",
		tags: ["Twitter"],
		summary: "Link Twitter bookmarks to their folders",
		description:
			"Queues bookmark-to-collection mapping messages. Used after sync-folders to associate imported Twitter bookmarks with their respective collections. Returns the count of successfully queued mappings.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: SyncFolderBookmarksInputSchema,
						examples: twitterSyncFolderBookmarksRequestExamples,
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
						examples: twitterSyncFolderBookmarksResponse200Examples,
					},
				},
			},
			400: {
				description: "Invalid request body or mapping data",
				content: {
					"application/json": {
						schema: apiResponseSchema(z.null()),
						examples: twitterSyncFolderBookmarksResponse400Examples,
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
