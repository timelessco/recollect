import { z } from "zod";

const BookmarkDataSchema = z.object({
	id: z
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" })
		.meta({ description: "Bookmark ID to move to trash" }),
});

export const MoveBookmarkToTrashInputSchema = z.object({
	data: z
		.array(BookmarkDataSchema)
		.min(1, { error: "At least one bookmark is required" })
		.meta({ description: "Array of bookmark objects to move to trash" }),
	isTrash: z.boolean({ error: "isTrash must be a boolean" }).meta({
		description: "True to move to trash, false to restore from trash",
	}),
});

export type MoveBookmarkToTrashInput = z.infer<
	typeof MoveBookmarkToTrashInputSchema
>;

export const MoveBookmarkToTrashOutputSchema = z.array(
	z.object({
		id: z.int().meta({ description: "Bookmark ID" }),
		trash: z.iso.datetime().nullable().meta({
			description: "ISO timestamp when trashed, null when restored",
		}),
	}),
);

export type MoveBookmarkToTrashOutput = z.infer<
	typeof MoveBookmarkToTrashOutputSchema
>;
