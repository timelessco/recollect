/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

import {
	raindropImport400Examples,
	raindropImportRequestExamples,
	raindropImportResponseExamples,
} from "./import-examples";

export const raindropImportSupplement = {
	path: "/raindrop/import",
	method: "post",
	tags: ["Raindrop"],
	summary: "Import Raindrop.io bookmarks",
	description:
		"Enqueues a batch of Raindrop.io bookmarks for async import. Deduplicates within the batch and against existing bookmarks. Returns counts of queued and skipped items.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: raindropImportRequestExamples,
	responseExamples: raindropImportResponseExamples,
	response400Examples: raindropImport400Examples,
	additionalResponses: {
		400: { description: "Invalid request body or bookmark data" },
	},
} satisfies EndpointSupplement;
