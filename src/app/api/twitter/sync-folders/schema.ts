import { z } from "zod";

export const SyncFoldersInputSchema = z.object({
	categories: z
		.array(
			z.object({
				name: z.string().trim().min(1, "Category name is required"),
			}),
		)
		.min(1, "At least one category required"),
});

export const SyncFoldersOutputSchema = z.object({
	created: z.number(),
	skipped: z.number(),
});
