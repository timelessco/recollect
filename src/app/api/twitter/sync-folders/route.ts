import slugify from "slugify";
import uniqid from "uniqid";
import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { CATEGORIES_TABLE_NAME, PROFILES } from "@/utils/constants";

const ROUTE = "twitter-sync-folders";

const SyncFoldersInputSchema = z.object({
	categories: z
		.array(
			z.object({
				name: z.string().min(1, "Category name is required"),
			}),
		)
		.min(1, "At least one category required"),
});

const SyncFoldersOutputSchema = z.object({
	created: z.number(),
	skipped: z.number(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: SyncFoldersInputSchema,
	outputSchema: SyncFoldersOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] Creating ${data.categories.length} categories`, {
			userId,
		});

		// Get existing categories (case-insensitive Dedup)
		const categoryNames = data.categories
			.map((category) => category.name.trim())
			.filter(Boolean);

		const { data: existingCategories, error: existingError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("category_name")
			.eq("user_id", userId);

		if (existingError) {
			return apiError({
				route,
				message: "Failed to fetch existing categories",
				error: existingError,
				operation: "fetch_categories",
				userId,
			});
		}

		const existingNamesLower = new Set(
			(existingCategories ?? []).map((category) =>
				String(category.category_name).toLowerCase(),
			),
		);

		// Dedupe request by case-insensitive name (first occurrence wins)
		const seenLower = new Set<string>();
		const uniqueNames = categoryNames.filter((name) => {
			const key = name.toLowerCase();
			if (seenLower.has(key)) {
				return false;
			}

			seenLower.add(key);
			return true;
		});

		// Filter out categories that already exist
		const newCategoryNames = uniqueNames.filter(
			(name) => !existingNamesLower.has(name.toLowerCase()),
		);

		if (newCategoryNames.length === 0) {
			return { created: 0, skipped: categoryNames.length };
		}

		// Insert new categories with twitter slug pattern
		const rowsToInsert = newCategoryNames.map((categoryName) => ({
			category_name: categoryName,
			user_id: userId,
			category_slug: `${slugify(categoryName, {
				lower: true,
			})}-${uniqid.time()}-twitter`,
			icon: "bookmark",
			icon_color: "#ffffff",
		}));

		const { data: insertedCategories, error: insertError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.insert(rowsToInsert)
			.select();

		if (insertError) {
			// Race condition: another request inserted the same category between
			// our SELECT and INSERT. Return 409 so the client can retry.
			if (insertError.code === "23505") {
				console.warn(`[${route}] Duplicate category (race condition)`, {
					userId,
					error: insertError,
				});
				return apiWarn({
					route,
					message: "Duplicate category name detected",
					status: 409,
				});
			}

			return apiError({
				route,
				message: "Failed to create categories",
				error: insertError,
				operation: "insert_categories",
				userId,
			});
		}

		// Update category_order in profile
		if (insertedCategories && insertedCategories.length > 0) {
			const { data: profileData, error: profileError } = await supabase
				.from(PROFILES)
				.select("category_order")
				.eq("id", userId)
				.single();

			if (profileError) {
				return apiError({
					route,
					message: "Failed to fetch profile",
					error: profileError,
					operation: "fetch_profile",
					userId,
				});
			}

			const existingOrder = profileData?.category_order ?? [];
			const newIds = insertedCategories.map((item) => item.id);
			const updatedOrder = [...existingOrder, ...newIds];

			const { error: orderError } = await supabase
				.from(PROFILES)
				.update({ category_order: updatedOrder })
				.eq("id", userId);

			if (orderError) {
				return apiError({
					route,
					message: "Failed to update category order",
					error: orderError,
					operation: "update_category_order",
					userId,
				});
			}
		}

		const created = insertedCategories?.length ?? 0;
		const skipped = categoryNames.length - created;

		console.log(`[${route}] Done:`, { created, skipped, userId });

		return { created, skipped };
	},
});
