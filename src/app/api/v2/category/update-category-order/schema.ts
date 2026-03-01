import { z } from "zod";

export const UpdateCategoryOrderInputSchema = z.object({
	category_order: z.array(z.int()).nullable(),
});

export const UpdateCategoryOrderOutputSchema = z.array(
	z.object({
		category_order: z.array(z.int()).nullable(),
		id: z.string(),
	}),
);
