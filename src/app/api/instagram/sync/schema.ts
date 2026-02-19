import { z } from "zod";

import { instagramType } from "@/utils/constants";

export const InstagramSyncInputSchema = z.object({
	bookmarks: z
		.array(
			z.object({
				url: z.url().refine((url) => {
					try {
						const parsed = new URL(url);
						return (
							parsed.hostname === "instagram.com" ||
							parsed.hostname === "www.instagram.com"
						);
					} catch {
						return false;
					}
				}, "Must be a valid Instagram URL"),
				title: z.string().default(""),
				description: z.string().default(""),
				ogImage: z.string().nullish(),
				type: z.literal(instagramType).default(instagramType),
				meta_data: z.record(z.string(), z.unknown()).default({}),
				saved_at: z.iso.datetime(),
			}),
		)
		.min(1, "At least one bookmark required")
		.max(500, "Maximum 500 bookmarks per request"),
});

export const InstagramSyncOutputSchema = z.object({
	inserted: z.number(),
	skipped: z.number(),
});
