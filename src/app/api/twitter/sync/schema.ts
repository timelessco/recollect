import { z } from "zod";

import { tweetType } from "@/utils/constants";

export const TwitterSyncInputSchema = z.object({
	bookmarks: z
		.array(
			z.object({
				url: z.string().url(),
				title: z.string().default(""),
				description: z.string().default(""),
				ogImage: z.string().nullish(),
				type: z.literal(tweetType).default(tweetType),
				meta_data: z.record(z.string(), z.unknown()).default({}),
				sort_index: z.string().default(""),
				inserted_at: z.string().datetime().optional(),
			}),
		)
		.min(1, "At least one bookmark required")
		.max(500, "Maximum 500 bookmarks per request"),
});

export const TwitterSyncOutputSchema = z.object({
	inserted: z.number(),
	skipped: z.number(),
});
