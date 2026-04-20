import { z } from "zod";

export const SetBookmarkCategoriesInputSchema = z.object({
  bookmark_id: z
    .int({ error: "Bookmark ID must be a whole number" })
    .positive({ error: "Bookmark ID must be a positive number" })
    .meta({ description: "ID of the bookmark to update" }),
  category_ids: z
    .array(
      z
        .int({ error: "Category ID must be a whole number" })
        .min(0, { error: "Category ID must be non-negative" }),
    )
    .max(100, {
      error: "Cannot add more than 100 categories to a bookmark",
    })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "Duplicate category IDs not allowed",
    })
    .meta({
      description:
        "Complete list of category IDs to assign. Replaces all existing assignments. Max 100. No duplicates.",
    }),
});

export type SetBookmarkCategoriesInput = z.infer<typeof SetBookmarkCategoriesInputSchema>;

export const SetBookmarkCategoriesOutputSchema = z.array(
  z.object({
    bookmark_id: z.int().meta({ description: "ID of the affected bookmark" }),
    category_id: z.int().meta({ description: "ID of an assigned category" }),
  }),
);

export type SetBookmarkCategoriesOutput = z.infer<typeof SetBookmarkCategoriesOutputSchema>;
