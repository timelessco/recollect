import { z } from "zod";

export const RaindropImportInputSchema = z.object({
	bookmarks: z
		.array(
			z.object({
				title: z.string().nullable(),
				description: z.string().nullable(),
				url: z.string().url(),
				ogImage: z.string().nullable(),
				category_name: z.string().nullable(),
				inserted_at: z.string().datetime().nullable().or(z.literal("")),
			}),
		)
		.min(1, "At least one bookmark required")
		.max(500, "Maximum 500 bookmarks per request"),
});

export const RaindropImportOutputSchema = z.object({
	queued: z.number(),
	skipped: z.number(),
});
