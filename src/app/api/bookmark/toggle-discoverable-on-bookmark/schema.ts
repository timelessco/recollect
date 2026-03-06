import { z } from "zod";

import { isNullable } from "@/utils/assertion-utils";

export const ToggleBookmarkDiscoverablePayloadSchema = z.object({
	bookmark_id: z
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" })
		.meta({
			description: "ID of the bookmark to update",
		}),
	make_discoverable: z
		.boolean({
			error: (issue) =>
				isNullable(issue.input)
					? "make_discoverable is required"
					: "make_discoverable must be a boolean",
		})
		.meta({
			description: "True to make discoverable, false to remove discoverability",
		}),
});

export type ToggleBookmarkDiscoverablePayload = z.infer<
	typeof ToggleBookmarkDiscoverablePayloadSchema
>;

export const ToggleBookmarkDiscoverableResponseSchema = z.object({
	id: z.number().meta({ description: "Bookmark ID" }),
	make_discoverable: z.string().nullable().meta({
		description:
			"ISO timestamp when made discoverable, null if not discoverable",
	}),
});

export type ToggleBookmarkDiscoverableResponse = z.infer<
	typeof ToggleBookmarkDiscoverableResponseSchema
>;
