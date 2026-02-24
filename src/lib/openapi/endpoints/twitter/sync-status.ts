/**
 * @module Build-time only
 */
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";
import { ImportStatusSchema } from "@/lib/openapi/schemas/shared";

export function registerTwitterSyncStatus() {
	registry.registerPath({
		method: "get",
		path: "/twitter/sync/status",
		tags: ["Twitter"],
		summary: "Get Twitter sync status",
		description:
			"Returns the current status of the Twitter/X bookmark sync queue, including counts of pending and archived items with individual archive records.",
		security: [{ [bearerAuth.name]: [] }, {}],
		responses: {
			200: {
				description: "Sync status retrieved successfully",
				content: {
					"application/json": {
						schema: apiResponseSchema(ImportStatusSchema),
						examples: {
							"status-with-data": {
								summary: "Status with pending and archived counts",
								description:
									"Returns current queue depth and archive records for the authenticated user.",
								value: {
									data: {
										pending: 3,
										archived: 250,
										archives: [
											{
												msg_id: 88,
												url: "https://x.com/SawyerMerritt/status/1986170355535286529",
												failure_reason: null,
												archived_at: "2024-03-15T10:45:00Z",
											},
										],
									},
									error: null,
								},
							},
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
