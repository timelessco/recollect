import { z } from "zod";

export const SyncFolderBookmarksInputSchema = z.object({
	mappings: z
		.array(
			z.object({
				url: z.string().url(),
				category_name: z.string().min(1, "Category name is required"),
			}),
		)
		.min(1, "At least one mapping required")
		.max(500, "Maximum 500 mappings per request"),
});

export const SyncFolderBookmarksOutputSchema = z.object({
	queued: z.number(),
});
