import { z } from "zod";

export const RaindropImportInputSchema = z.object({
	bookmarks: z
		.array(
			z.object({
				title: z.string().nullable(),
				description: z.string().nullable(),
				url: z.url(),
				ogImage: z.string().nullable(),
				category_name: z.string().nullable(),
				inserted_at: z.iso.datetime().nullable().or(z.literal("")),
			}),
		)
		.min(1, { error: "At least one bookmark required" })
		.max(500, { error: "Maximum 500 bookmarks per request" }),
});

export const RaindropImportOutputSchema = z.object({
	queued: z.number(),
	skipped: z.number(),
});
