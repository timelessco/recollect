/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const twitterSyncStatusSupplement = {
	path: "/twitter/sync/status",
	method: "get",
	tags: ["Twitter"],
	summary: "Get Twitter sync status",
	description:
		"Returns the current status of the Twitter/X bookmark sync queue, including counts of pending and archived items with individual archive records.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
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
} satisfies EndpointSupplement;
