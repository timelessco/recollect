/**
 * @module Build-time only
 */
import {
	RaindropImportInputSchema,
	RaindropImportOutputSchema,
} from "@/app/api/raindrop/import/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import { z } from "zod";

import {
	raindropImport400Examples,
	raindropImportRequestExamples,
	raindropImportResponseExamples,
} from "./import-examples";

export function registerRaindropImport() {
	registry.registerPath({
		method: "post",
		path: "/raindrop/import",
		tags: ["Raindrop"],
		summary: "Import Raindrop.io bookmarks",
		description:
			"Enqueues a batch of Raindrop.io bookmarks for async import. Deduplicates within the batch and against existing bookmarks. Returns counts of queued and skipped items.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: RaindropImportInputSchema,
						examples: raindropImportRequestExamples,
					},
				},
			},
		},
		responses: {
			200: {
				description: "Bookmarks successfully queued for import",
				content: {
					"application/json": {
						schema: apiResponseSchema(RaindropImportOutputSchema),
						examples: raindropImportResponseExamples,
					},
				},
			},
			400: {
				description: "Invalid request body or bookmark data",
				content: {
					"application/json": {
						schema: apiResponseSchema(z.null()),
						examples: raindropImport400Examples,
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
