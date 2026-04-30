import { z } from "zod";

export const RemoveCategoryFromBookmarkInputSchema = z.object({
  bookmark_id: z
    .int({ error: "Bookmark ID must be a whole number" })
    .positive({ error: "Bookmark ID must be a positive number" })
    .meta({ description: "ID of the bookmark to remove the category from" }),
  category_id: z
    .int({ error: "Category ID must be a whole number" })
    .min(0, { error: "Category ID must be non-negative" })
    .meta({
      description:
        "Category ID to remove (0 = uncategorized, auto-managed; handler returns 400 if 0 is sent)",
    }),
});

export type RemoveCategoryFromBookmarkInput = z.infer<typeof RemoveCategoryFromBookmarkInputSchema>;

export const RemoveCategoryFromBookmarkOutputSchema = z.array(
  z.object({
    bookmark_id: z.int().meta({ description: "ID of the affected bookmark" }),
    category_id: z.int().meta({ description: "ID of the removed category" }),
  }),
);

export type RemoveCategoryFromBookmarkOutput = z.infer<
  typeof RemoveCategoryFromBookmarkOutputSchema
>;
