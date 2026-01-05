import { z } from "zod";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import { type Database } from "@/types/database-generated.types";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import {
	CATEGORIES_TABLE_NAME,
	DUPLICATE_CATEGORY_NAME_ERROR,
} from "@/utils/constants";

const ROUTE = "update-user-category";

// Use looseObject for flexible JSONB column handling (allows extra keys)
const categoryViewsSchema = z
	.looseObject({
		bookmarksView: z.string().optional(),
		cardContentViewArray: z.array(z.string()).optional(),
		moodboardColumns: z.array(z.number()).optional(),
		sortBy: z.string().optional(),
	})
	.optional();

const UpdateCategoryPayloadSchema = z.object({
	category_id: z.union([z.number(), z.string()]),
	updateData: z.object({
		category_name: tagCategoryNameSchema.optional(),
		category_views: categoryViewsSchema,
		icon: z.string().nullable().optional(),
		icon_color: z.string().optional(),
		is_public: z.boolean().optional(),
	}),
});

export type UpdateCategoryPayload = z.infer<typeof UpdateCategoryPayloadSchema>;

const UpdateCategoryResponseSchema = z
	.array(
		z.object({
			id: z.number(),
			category_name: z.string().nullable(),
			category_slug: z.string(),
			category_views: z.unknown().nullable(),
			created_at: z.string().nullable(),
			icon: z.string().nullable(),
			icon_color: z.string().nullable(),
			is_public: z.boolean(),
			order_index: z.number().nullable(),
			user_id: z.string().nullable(),
		}),
	)
	.nonempty();

export type UpdateCategoryResponse = [
	z.infer<typeof UpdateCategoryResponseSchema>[number],
	...z.infer<typeof UpdateCategoryResponseSchema>,
];

export const POST = createSupabasePostApiHandler({
	route: ROUTE,
	inputSchema: UpdateCategoryPayloadSchema,
	outputSchema: UpdateCategoryResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { category_id: categoryId, updateData } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			categoryId,
			categoryName: updateData.category_name,
		});

		const { data: categoryData, error } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.update(
				updateData as Database["public"]["Tables"]["categories"]["Update"],
			)
			.match({ id: categoryId, user_id: userId })
			.select();

		if (error) {
			// Handle unique constraint violation (case-insensitive duplicate)
			// Postgres error code 23505 = unique_violation
			if (
				error.code === "23505" ||
				error.message?.includes("unique_user_category_name_ci")
			) {
				return apiWarn({
					route,
					message: DUPLICATE_CATEGORY_NAME_ERROR,
					status: 409,
					context: { name: updateData.category_name, userId },
				});
			}

			return apiError({
				route,
				message: "Error updating category",
				error,
				operation: "update_category",
				userId,
				extra: { categoryId },
			});
		}

		if (!isNonEmptyArray(categoryData)) {
			return apiError({
				route,
				message: "No data returned from database",
				error: new Error("Empty update result"),
				operation: "update_category_empty",
				userId,
			});
		}

		console.log(`[${route}] Category updated:`, {
			categoryId: categoryData[0].id,
			categoryName: categoryData[0].category_name,
		});

		return categoryData;
	},
});
