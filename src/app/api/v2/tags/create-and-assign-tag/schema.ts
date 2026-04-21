import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

export const CreateAndAssignTagInputSchema = z.object({
  bookmarkId: z.int().positive().meta({
    description: "ID of the bookmark to assign the new tag to.",
  }),
  name: tagCategoryNameSchema.meta({
    description:
      "Tag name to create. Trimmed server-side; length must satisfy the shared tag/category name bounds.",
  }),
});

export type CreateAndAssignTagInput = z.infer<typeof CreateAndAssignTagInputSchema>;

const BookmarkTagSchema = z.object({
  bookmark_id: z.int().meta({ description: "Associated bookmark identifier." }),
  created_at: z.string().nullable().meta({
    description: "Junction row creation timestamp in ISO 8601 with +00:00 offset.",
  }),
  id: z.int().meta({ description: "Junction (bookmark_tags) row identifier." }),
  tag_id: z.int().meta({ description: "Associated tag identifier." }),
  user_id: z.string().nullable().meta({ description: "Owning user's UUID." }),
});

const TagSchema = z.object({
  created_at: z.string().nullable().meta({
    description: "Tag creation timestamp in ISO 8601 with +00:00 offset.",
  }),
  id: z.int().meta({ description: "Newly created tag identifier." }),
  name: z.string().nullable().meta({ description: "Tag display name." }),
  user_id: z.string().nullable().meta({ description: "Owning user's UUID." }),
});

export const CreateAndAssignTagOutputSchema = z.object({
  bookmarkTag: BookmarkTagSchema.meta({
    description: "The bookmark_tags junction row linking the new tag to the bookmark.",
  }),
  tag: TagSchema.meta({ description: "The newly created tag row." }),
});

export type CreateAndAssignTagOutput = z.infer<typeof CreateAndAssignTagOutputSchema>;
