/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

import {
	instagramSync400Examples,
	instagramSyncRequestExamples,
	instagramSyncResponseExamples,
} from "./sync-examples";

export const instagramSyncSupplement = {
	path: "/instagram/sync",
	method: "post",
	tags: ["Instagram"],
	summary: "Sync Instagram bookmarks",
	description:
		"Enqueues a batch of Instagram bookmarks for async archiving. Deduplicates within the batch and against existing bookmarks. Returns counts of inserted and skipped items.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: instagramSyncRequestExamples,
	responseExamples: instagramSyncResponseExamples,
	response400Examples: instagramSync400Examples,
	additionalResponses: {
		400: { description: "Invalid request body or bookmark data" },
	},
} satisfies EndpointSupplement;
