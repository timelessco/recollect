import { z } from "zod";

export const DeleteCategoryInputSchema = z.object({
	category_id: z.number().meta({ description: "ID of the category to delete" }),
});

export type DeleteCategoryInput = z.infer<typeof DeleteCategoryInputSchema>;

export const DeleteCategoryResponseSchema = z
	.array(
		z.object({
			category_name: z
				.string()
				.nullable()
				.meta({ description: "Category display name" }),
			category_slug: z.string().meta({ description: "URL-safe slug" }),
			category_views: z
				.unknown()
				.nullable()
				.meta({ description: "JSONB view configuration" }),
			created_at: z
				.string()
				.nullable()
				.meta({ description: "ISO creation timestamp" }),
			icon: z.string().nullable().meta({ description: "Icon identifier" }),
			icon_color: z
				.string()
				.nullable()
				.meta({ description: "Icon color hex code" }),
			id: z.number().meta({ description: "Category ID" }),
			is_public: z
				.boolean()
				.meta({ description: "Whether collection was publicly visible" }),
			order_index: z
				.number()
				.nullable()
				.meta({ description: "Sort order position" }),
			user_id: z.string().nullable().meta({ description: "Owner user ID" }),
		}),
	)
	.nonempty();

export type DeleteCategoryResponse = [
	z.infer<typeof DeleteCategoryResponseSchema>[number],
	...z.infer<typeof DeleteCategoryResponseSchema>,
];
