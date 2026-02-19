/**
 * @module Build-time only
 */
import { z } from "zod";

import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import { ImportStatusSchema } from "@/lib/openapi/schemas/shared";

export function registerInstagramSyncStatus() {
	registry.registerPath({
		method: "get",
		path: "/instagram/sync/status",
		tags: ["instagram"],
		summary: "Get Instagram sync status",
		description:
			"Returns the current status of the Instagram bookmark sync queue, " +
			"including counts of pending and archived items with individual archive records.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			query: z.object({}),
		},
		responses: {
			200: {
				description: "Sync status retrieved successfully",
				content: {
					"application/json": {
						schema: apiResponseSchema(ImportStatusSchema),
						example: {
							data: {
								pending: 5,
								archived: 120,
								archives: [
									{
										msg_id: 42,
										url: "https://www.instagram.com/p/ABC123/",
										failure_reason: null,
										archived_at: "2024-03-15T10:35:00Z",
									},
								],
							},
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
