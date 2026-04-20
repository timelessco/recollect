import { z } from "zod";

export const RemoveTagFromBookmarkInputSchema = z.object({
  bookmarkId: z.int().min(1).meta({
    description: "Bookmark identifier to remove the tag from.",
  }),
  tagId: z.int().min(1).meta({
    description: "Tag identifier to remove from the bookmark.",
  }),
});

export type RemoveTagFromBookmarkInput = z.infer<typeof RemoveTagFromBookmarkInputSchema>;

const BookmarkTagRow = z.object({
  bookmark_id: z.int().meta({ description: "Bookmark identifier." }),
  created_at: z.string().nullable().meta({
    description: "Junction row creation timestamp in ISO 8601 with +00:00 offset.",
  }),
  id: z.int().meta({ description: "Junction row identifier." }),
  tag_id: z.int().meta({ description: "Tag identifier." }),
  user_id: z.string().nullable().meta({ description: "Owning user's UUID." }),
});

export const RemoveTagFromBookmarkOutputSchema = z.array(BookmarkTagRow).nonempty().meta({
  description: "Non-empty array of deleted bookmark_tags rows (always length 1).",
});

export type RemoveTagFromBookmarkOutput = z.infer<typeof RemoveTagFromBookmarkOutputSchema>;
