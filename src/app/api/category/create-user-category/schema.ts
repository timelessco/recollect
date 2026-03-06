import { z } from "zod";

import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";

export const CreateCategoryPayloadSchema = z.object({
	name: tagCategoryNameSchema.meta({
		description: "Category display name (1–20 characters)",
	}),
	category_order: z
		.array(z.number())
		.nullish()
		.meta({
			description:
				"Current ordered list of category IDs from the user profile. " +
				"The new category ID will be appended. Omit to skip reordering.",
		}),
});

export type CreateCategoryPayload = z.infer<typeof CreateCategoryPayloadSchema>;

export const CreateCategoryResponseSchema = z
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

export type CreateCategoryResponse = [
	z.infer<typeof CreateCategoryResponseSchema>[number],
	...z.infer<typeof CreateCategoryResponseSchema>,
];
