/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const clearTrashSupplement = {
	path: "/cron/clear-trash",
	method: "get",
	tags: ["Cron"],
	summary: "Permanently delete expired trashed bookmarks",
	description:
		"Cron-triggered cleanup that permanently deletes bookmarks trashed more than 30 days ago. Processes in batches of 1000, grouped by user. Requires `CRON_SECRET` as bearer token (not a user JWT).",
	security: [{ [bearerAuth.name]: [] }],
	responseExample: {
		data: { deletedCount: 42 },
		error: null,
	},
} satisfies EndpointSupplement;
