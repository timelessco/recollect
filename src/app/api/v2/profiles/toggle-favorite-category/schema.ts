import { z } from "zod";

export const ToggleFavoriteCategoryInputSchema = z.object({
  category_id: z.int().min(0).meta({
    description: "Category identifier to toggle. 0 = Uncategorized.",
  }),
});

export const ToggleFavoriteCategoryOutputSchema = z.object({
  favorite_categories: z.array(z.int()).meta({
    description:
      "Updated ordered list of favorite category IDs after the toggle. The category_id will be present if it was added, absent if it was removed.",
  }),
  id: z.string().meta({ description: "User profile ID (auth user UUID)." }),
});
