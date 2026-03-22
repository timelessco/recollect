import { z } from "zod";

export const ToggleFavoriteCategoryPayloadSchema = z.object({
  category_id: z.int().min(0).meta({ description: "Category ID to toggle as favorite" }),
});

export const ToggleFavoriteCategoryResponseSchema = z.object({
  favorite_categories: z
    .array(z.int())
    .meta({ description: "Updated ordered list of favorite category IDs" }),
  id: z.string().meta({ description: "User profile ID" }),
});
