/**
 * @module Build-time only
 */
import {
	SyncFoldersInputSchema,
	SyncFoldersOutputSchema,
} from "@/app/api/twitter/sync-folders/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerTwitterSyncFolders() {
	registry.registerPath({
		method: "post",
		path: "/twitter/sync-folders",
		tags: ["twitter"],
		summary: "Sync Twitter bookmark folders as collections",
		description:
			"Creates Recollect collections from Twitter/X bookmark folder names. " +
			"Deduplicates by case-insensitive name match against existing collections. " +
			"Returns counts of created and skipped collections.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: SyncFoldersInputSchema,
						example: {
							categories: [
								{ name: "Tech Articles" },
								{ name: "Design Inspiration" },
								{ name: "Reading List" },
							],
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Folders synced successfully",
				content: {
					"application/json": {
						schema: apiResponseSchema(SyncFoldersOutputSchema),
						example: {
							data: { created: 2, skipped: 1 },
							error: null,
						},
					},
				},
			},
			400: { description: "Invalid request body or category data" },
			401: { $ref: "#/components/responses/Unauthorized" },
			409: {
				description:
					"Duplicate category name detected (race condition — retry request)",
			},
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
