import { z } from "zod";

export const AddCategoryToBookmarkPayloadSchema = z.object({
	bookmark_id: z
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" })
		.meta({ description: "ID of the bookmark to assign the category to" }),
	category_id: z
		.int({ error: "Category ID must be a whole number" })
		.min(0, { error: "Category ID must be non-negative" })
		.meta({
			description:
				"Category ID to assign (0 = uncategorized, positive = real category)",
		}),
});

export type AddCategoryToBookmarkPayload = z.infer<
	typeof AddCategoryToBookmarkPayloadSchema
>;

export const AddCategoryToBookmarkResponseSchema = z.array(
	z.object({
		bookmark_id: z.int().meta({ description: "ID of the affected bookmark" }),
		category_id: z.int().meta({ description: "ID of the assigned category" }),
	}),
);

export type AddCategoryToBookmarkResponse = z.infer<
	typeof AddCategoryToBookmarkResponseSchema
>;
