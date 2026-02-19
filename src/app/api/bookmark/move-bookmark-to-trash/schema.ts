import { z } from "zod";

const BookmarkDataSchema = z.object({
	id: z
		.number({ error: "Bookmark ID must be a number" })
		.meta({ description: "Bookmark ID to move to trash" }),
});

export const MoveBookmarkToTrashInputSchema = z.object({
	data: z
		.array(BookmarkDataSchema)
		.min(1, { message: "At least one bookmark is required" })
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
		id: z.number().meta({ description: "Bookmark ID" }),
		trash: z.string().nullable().meta({
			description: "ISO timestamp when trashed, null when restored",
		}),
	}),
);

export type MoveBookmarkToTrashOutput = z.infer<
	typeof MoveBookmarkToTrashOutputSchema
>;
