/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

import {
	twitterSyncRequestExamples,
	twitterSyncResponse200Examples,
	twitterSyncResponse400Examples,
} from "./sync-examples";

export const twitterSyncSupplement = {
	path: "/twitter/sync",
	method: "post",
	tags: ["Twitter"],
	summary: "Sync Twitter/X bookmarks",
	description:
		"Enqueues a batch of Twitter/X bookmarks for async archiving. Deduplicates within the batch and against existing bookmarks. Returns counts of inserted and skipped items.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: twitterSyncRequestExamples,
	responseExamples: twitterSyncResponse200Examples,
	response400Examples: twitterSyncResponse400Examples,
	additionalResponses: {
		400: { description: "Invalid request body or bookmark data" },
	},
} satisfies EndpointSupplement;
