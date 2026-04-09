import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

export const CreateAndAssignTagPayloadSchema = z.object({
  bookmarkId: z
    .int()
    .positive()
    .meta({ description: "ID of the bookmark to assign the new tag to" }),
  name: tagCategoryNameSchema.meta({
    description: "Tag name to create (1–20 characters)",
  }),
});

export type CreateAndAssignTagPayload = z.infer<typeof CreateAndAssignTagPayloadSchema>;

const TagSchema = z.object({
  created_at: z.string().nullable().meta({ description: "ISO timestamp when tag was created" }),
  id: z.number().meta({ description: "Newly created tag ID" }),
  name: z.string().nullable().meta({ description: "Tag name" }),
  user_id: z.string().nullable().meta({ description: "Owner user ID" }),
});

const BookmarkTagSchema = z.object({
  bookmark_id: z.number().meta({ description: "Associated bookmark ID" }),
  created_at: z
    .string()
    .nullable()
    .meta({ description: "ISO timestamp when assignment was created" }),
  id: z.number().meta({ description: "Bookmark-tag junction record ID" }),
  tag_id: z.number().meta({ description: "Associated tag ID" }),
  user_id: z.string().nullable().meta({ description: "Owner user ID" }),
});

export const CreateAndAssignTagResponseSchema = z.object({
  bookmarkTag: BookmarkTagSchema.meta({
    description: "The tag-to-bookmark assignment record",
  }),
  tag: TagSchema.meta({ description: "The newly created tag" }),
});

export type CreateAndAssignTagResponse = z.infer<typeof CreateAndAssignTagResponseSchema>;
