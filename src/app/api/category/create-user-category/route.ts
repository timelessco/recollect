import slugify from "slugify";
import uniqid from "uniqid";
import { z } from "zod";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { tagCategoryNameSchema } from "@/lib/validation/tag-category-schema";
import { isNonEmptyArray, isNonNullable } from "@/utils/assertion-utils";
import {
	CATEGORIES_TABLE_NAME,
	DUPLICATE_CATEGORY_NAME_ERROR,
	PROFILES,
} from "@/utils/constants";

const ROUTE = "create-user-category";

const CreateCategoryPayloadSchema = z.object({
	name: tagCategoryNameSchema,
	category_order: z.array(z.number()).nullish(),
});

export type CreateCategoryPayload = z.infer<typeof CreateCategoryPayloadSchema>;

const CreateCategoryResponseSchema = z
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

export type CreateCategoryResponse = [
	z.infer<typeof CreateCategoryResponseSchema>[number],
	...z.infer<typeof CreateCategoryResponseSchema>,
];

export const POST = createSupabasePostApiHandler({
	route: ROUTE,
	inputSchema: CreateCategoryPayloadSchema,
	outputSchema: CreateCategoryResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { name, category_order: categoryOrder } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, { userId, name });

		const { data: categoryData, error } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.insert([
				{
					category_name: name,
					user_id: userId,
					category_slug: `${slugify(name, { lower: true })}-${uniqid.time()}`,
				},
			])
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
					context: { name, userId },
				});
			}

			return apiError({
				route,
				message: "Error creating category",
				error,
				operation: "insert_category",
				userId,
				extra: { name },
			});
		}

		if (!isNonEmptyArray(categoryData)) {
			return apiError({
				route,
				message: "No data returned from database",
				error: new Error("Empty insert result"),
				operation: "insert_category_empty",
				userId,
			});
		}

		// Update category order if provided
		if (isNonNullable(categoryOrder)) {
			const newCategoryId = categoryData[0].id;

			console.log(`[${route}] Updating category order:`, { newCategoryId });

			const { error: orderError } = await supabase
				.from(PROFILES)
				.update({ category_order: [...categoryOrder, newCategoryId] })
				.match({ id: userId })
				.select("id, category_order");

			if (orderError) {
				return apiError({
					route,
					message: "Error updating category order",
					error: orderError,
					operation: "update_category_order",
					userId,
					extra: { categoryId: newCategoryId },
				});
			}
		}

		console.log(`[${route}] Category created:`, {
			categoryId: categoryData[0].id,
		});

		return categoryData;
	},
});
