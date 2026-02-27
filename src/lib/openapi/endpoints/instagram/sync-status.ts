/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const instagramSyncStatusSupplement = {
	path: "/instagram/sync/status",
	method: "get",
	tags: ["Instagram"],
	summary: "Get Instagram sync status",
	description:
		"Returns the current status of the Instagram bookmark sync queue, including counts of pending and archived items with individual archive records.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
		"status-with-data": {
			summary: "Status with pending and archived items",
			description:
				"Typical response showing items still in queue (pending) and previously archived failures. The archives array contains individual failure records with msg_id, url, failure_reason, and archived_at.",
			value: {
				data: {
					pending: 5,
					archived: 120,
					archives: [
						{
							msg_id: 42,
							url: "https://www.instagram.com/p/ABC123/",
							failure_reason: "invalid_url",
							archived_at: "2024-03-15T10:35:00Z",
						},
					],
				},
				error: null,
			},
		},
	},
} satisfies EndpointSupplement;
