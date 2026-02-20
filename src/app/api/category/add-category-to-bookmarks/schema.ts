import { z } from "zod";

export const AddCategoryToBookmarksPayloadSchema = z.object({
	bookmark_ids: z
		.array(
			z
				.int({ error: "Bookmark ID must be a whole number" })
				.positive({ error: "Bookmark ID must be a positive number" }),
		)
		.min(1, { error: "At least one bookmark ID is required" })
		.max(100, { error: "Cannot process more than 100 bookmarks at once" })
		.meta({
			description: "Array of bookmark IDs to assign the category to (1–100)",
		}),
	category_id: z
		.int({ error: "Collection ID must be a whole number" })
		.min(0, { error: "Collection ID must be non-negative" })
		.meta({
			description:
				"Category ID to assign (0 = uncategorized, positive = real category)",
		}),
});

export type AddCategoryToBookmarksPayload = z.infer<
	typeof AddCategoryToBookmarksPayloadSchema
>;

export const AddCategoryToBookmarksResponseSchema = z.array(
	z.object({
		bookmark_id: z.int().meta({ description: "ID of the affected bookmark" }),
		category_id: z.int().meta({ description: "ID of the assigned category" }),
	}),
);

export type AddCategoryToBookmarksResponse = z.infer<
	typeof AddCategoryToBookmarksResponseSchema
>;
