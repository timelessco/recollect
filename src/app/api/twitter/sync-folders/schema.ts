import { z } from "zod";

export const SyncFoldersInputSchema = z.object({
	categories: z
		.array(
			z.object({
				name: z.string().trim().min(1, { error: "Category name is required" }),
			}),
		)
		.min(1, { error: "At least one category required" }),
});

export const SyncFoldersOutputSchema = z.object({
	created: z.number(),
	skipped: z.number(),
});
