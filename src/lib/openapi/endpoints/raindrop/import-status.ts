/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const raindropImportStatusSupplement = {
	path: "/raindrop/import/status",
	method: "get",
	tags: ["Raindrop"],
	summary: "Get Raindrop import status",
	description:
		"Returns the current status of the Raindrop.io import queue, including counts of pending and archived items with individual archive records.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExamples: {
		"status-with-data": {
			summary: "Status with pending and archived items",
			description:
				"Typical response showing items still in queue (pending) and previously archived failures. The archives array contains individual failure records with msg_id, url, failure_reason, and archived_at.",
			value: {
				data: {
					pending: 10,
					archived: 500,
					archives: [
						{
							msg_id: 17,
							url: "https://example.com/article",
							failure_reason: "Failed to fetch URL",
							archived_at: "2024-03-15T11:00:00Z",
						},
					],
				},
				error: null,
			},
		},
	},
} satisfies EndpointSupplement;
