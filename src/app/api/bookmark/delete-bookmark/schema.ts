import { z } from "zod";

export const DeleteBookmarkInputSchema = z.object({
	deleteData: z
		.array(
			z.object({
				id: z
					.int({ error: "Bookmark ID must be a whole number" })
					.positive({ error: "Bookmark ID must be a positive number" })
					.meta({ description: "Bookmark ID to permanently delete" }),
			}),
		)
		.min(1, { error: "At least one bookmark is required" })
		.meta({ description: "Array of bookmark objects to delete" }),
});

export type DeleteBookmarkInput = z.infer<typeof DeleteBookmarkInputSchema>;

export const DeleteBookmarkOutputSchema = z.object({
	deletedCount: z
		.int()
		.meta({ description: "Total number of bookmarks permanently deleted" }),
	message: z
		.string()
		.meta({ description: "Human-readable summary of the operation" }),
});

export type DeleteBookmarkOutput = z.infer<typeof DeleteBookmarkOutputSchema>;
