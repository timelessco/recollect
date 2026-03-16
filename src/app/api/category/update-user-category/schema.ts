import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

const categoryViewsSchema = z
	.looseObject({
		bookmarksView: z.string().optional().meta({ description: "View layout" }),
		cardContentViewArray: z
			.array(z.string())
			.optional()
			.meta({ description: "Visible card content fields" }),
		moodboardColumns: z
			.array(z.number())
			.optional()
			.meta({ description: "Column widths for moodboard view" }),
		sortBy: z.string().optional().meta({ description: "Sort field" }),
	})
	.optional();

export const UpdateCategoryPayloadSchema = z.object({
	category_id: z
		.union([z.number(), z.string()])
		.meta({ description: "ID of the category to update (number or string)" }),
	updateData: z
		.object({
			category_name: tagCategoryNameSchema
				.optional()
				.meta({ description: "New category display name (1–20 characters)" }),
			category_views: categoryViewsSchema.meta({
				description:
					"View configuration JSONB. Additional properties allowed (additionalProperties: true).",
			}),
			icon: z
				.string()
				.nullable()
				.optional()
				.meta({ description: "New icon identifier" }),
			icon_color: z
				.string()
				.optional()
				.meta({ description: "New icon color hex code" }),
			is_public: z.boolean().optional().meta({
				description: "Whether to make the collection publicly visible",
			}),
		})
		.meta({ description: "Fields to update (all optional, omit to skip)" }),
});

export type UpdateCategoryPayload = z.infer<typeof UpdateCategoryPayloadSchema>;

export const UpdateCategoryResponseSchema = z
	.array(
		z.object({
			id: z.number().meta({ description: "Category ID" }),
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
			is_public: z
				.boolean()
				.meta({ description: "Whether collection is publicly visible" }),
			order_index: z
				.number()
				.nullable()
				.meta({ description: "Sort order position" }),
			user_id: z.string().nullable().meta({ description: "Owner user ID" }),
		}),
	)
	.nonempty();

export type UpdateCategoryResponse = [
	z.infer<typeof UpdateCategoryResponseSchema>[number],
	...z.infer<typeof UpdateCategoryResponseSchema>,
];
