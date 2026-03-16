import { z } from "zod";

export const ToggleFavoriteCategoryPayloadSchema = z.object({
	category_id: z.int().min(0),
});

export const ToggleFavoriteCategoryResponseSchema = z.object({
	id: z.string(),
	favorite_categories: z.array(z.int()),
});
