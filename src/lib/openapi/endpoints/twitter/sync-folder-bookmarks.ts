/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

import {
	twitterSyncFolderBookmarksRequestExamples,
	twitterSyncFolderBookmarksResponse200Examples,
	twitterSyncFolderBookmarksResponse400Examples,
} from "./sync-folder-bookmarks-examples";

export const twitterSyncFolderBookmarksSupplement = {
	path: "/twitter/sync-folder-bookmarks",
	method: "post",
	tags: ["Twitter"],
	summary: "Link Twitter bookmarks to their folders",
	description:
		"Queues bookmark-to-collection mapping messages. Used after sync-folders to associate imported Twitter bookmarks with their respective collections. Returns the count of successfully queued mappings.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: twitterSyncFolderBookmarksRequestExamples,
	responseExamples: twitterSyncFolderBookmarksResponse200Examples,
	response400Examples: twitterSyncFolderBookmarksResponse400Examples,
	additionalResponses: {
		400: { description: "Invalid request body or mapping data" },
	},
} satisfies EndpointSupplement;
