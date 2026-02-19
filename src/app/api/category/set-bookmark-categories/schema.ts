import { z } from "zod";

export const SetBookmarkCategoriesPayloadSchema = z.object({
	bookmark_id: z
		.int({ error: "Bookmark ID must be a whole number" })
		.positive({ error: "Bookmark ID must be a positive number" })
		.meta({ description: "ID of the bookmark to update" }),
	category_ids: z
		.array(
			z
				.int({ error: "Collection ID must be a whole number" })
				.min(0, { error: "Collection ID must be non-negative" }),
		)
		.max(100, {
			error: "Cannot add more than 100 collections to a bookmark",
		})
		.refine((ids) => new Set(ids).size === ids.length, {
			error: "Duplicate collection IDs not allowed",
		})
		.meta({
			description:
				"Complete list of category IDs to assign. Replaces all existing assignments. Max 100. No duplicates.",
		}),
});

export type SetBookmarkCategoriesPayload = z.infer<
	typeof SetBookmarkCategoriesPayloadSchema
>;

export const SetBookmarkCategoriesResponseSchema = z.array(
	z.object({
		bookmark_id: z
			.number()
			.meta({ description: "ID of the affected bookmark" }),
		category_id: z.number().meta({ description: "ID of an assigned category" }),
	}),
);

export type SetBookmarkCategoriesResponse = z.infer<
	typeof SetBookmarkCategoriesResponseSchema
>;
