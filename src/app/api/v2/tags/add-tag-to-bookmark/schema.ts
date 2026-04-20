import { z } from "zod";

export const AddTagToBookmarkInputSchema = z.object({
  bookmarkId: z.int().min(1).meta({
    description: "Bookmark identifier to attach the tag to.",
  }),
  tagId: z.int().min(1).meta({
    description: "Tag identifier to attach to the bookmark.",
  }),
});

export type AddTagToBookmarkInput = z.infer<typeof AddTagToBookmarkInputSchema>;

const BookmarkTagRow = z.object({
  bookmark_id: z.int().meta({ description: "Bookmark identifier." }),
  created_at: z.string().nullable().meta({
    description: "Junction row creation timestamp in ISO 8601 with +00:00 offset.",
  }),
  id: z.int().meta({ description: "Junction row identifier." }),
  tag_id: z.int().meta({ description: "Tag identifier." }),
  user_id: z.string().nullable().meta({ description: "Owning user's UUID." }),
});

export const AddTagToBookmarkOutputSchema = z.array(BookmarkTagRow).nonempty().meta({
  description: "Non-empty array of inserted bookmark_tags rows (always length 1).",
});

export type AddTagToBookmarkOutput = z.infer<typeof AddTagToBookmarkOutputSchema>;
