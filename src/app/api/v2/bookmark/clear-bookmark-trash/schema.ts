import { z } from "zod";

export const ClearBookmarkTrashInputSchema = z.object({});

export type ClearBookmarkTrashInput = z.infer<typeof ClearBookmarkTrashInputSchema>;

export const ClearBookmarkTrashOutputSchema = z.object({
  deletedCount: z.int().meta({
    description: "Total number of bookmarks permanently deleted from trash.",
  }),
  message: z.string().meta({
    description: "Human-readable summary of the operation.",
  }),
});

export type ClearBookmarkTrashOutput = z.infer<typeof ClearBookmarkTrashOutputSchema>;
