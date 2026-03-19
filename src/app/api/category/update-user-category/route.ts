import {
	UpdateCategoryPayloadSchema,
	UpdateCategoryResponseSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { revalidatePublicCategoryPage } from "@/lib/revalidation-helpers";
import { type Database } from "@/types/database-generated.types";
import { isNonEmptyArray } from "@/utils/assertion-utils";
import {
	CATEGORIES_TABLE_NAME,
	DUPLICATE_CATEGORY_NAME_ERROR,
	PROFILES,
} from "@/utils/constants";

const ROUTE = "update-user-category";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: UpdateCategoryPayloadSchema,
	outputSchema: UpdateCategoryResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { category_id: categoryId, updateData } = data;
		const userId = user.id;

		// Separate is_favorite (legacy compat) from actual category fields
		const { is_favorite, ...categoryUpdateData } = updateData;

		console.log(`[${route}] API called:`, {
			userId,
			categoryId,
			categoryName: categoryUpdateData.category_name,
		});

		// Run category table update first (if there are fields to update)
		const hasOtherUpdates = Object.keys(categoryUpdateData).length > 0;

		const { data: categoryData, error } = hasOtherUpdates
			? await supabase
					.from(CATEGORIES_TABLE_NAME)
					.update(
						categoryUpdateData as Database["public"]["Tables"]["categories"]["Update"],
					)
					.match({ id: categoryId, user_id: userId })
					.select()
			: await supabase
					.from(CATEGORIES_TABLE_NAME)
					.select()
					.match({ id: categoryId, user_id: userId });

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

		// @deprecated Legacy compat for old mobile builds. Remove when old builds are no longer supported.
		// Handle legacy is_favorite → profiles.favorite_categories update
		// Runs after category update succeeds to avoid mutating favorites on a failed request
		if (is_favorite !== undefined) {
			const numericCategoryId =
				typeof categoryId === "string"
					? Number.parseInt(categoryId, 10)
					: categoryId;

			if (is_favorite) {
				// Add to favorites (idempotent: remove first, then toggle to add)
				const { error: removeError } = await supabase.rpc(
					"remove_favorite_category_for_user" as never,
					{ p_category_id: numericCategoryId } as never,
				);

				if (removeError) {
					return apiError({
						route,
						message: "Error updating favorite status",
						error: removeError,
						operation: "remove_favorite_category",
						userId,
						extra: { categoryId },
					});
				}

				const { error: toggleError } = await supabase.rpc(
					"toggle_favorite_category" as never,
					{ p_category_id: numericCategoryId } as never,
				);

				if (toggleError) {
					return apiError({
						route,
						message: "Error updating favorite status",
						error: toggleError,
						operation: "toggle_favorite_category",
						userId,
						extra: { categoryId },
					});
				}
			} else {
				// Remove from favorites (idempotent: no-op if absent)
				const { error: removeError } = await supabase.rpc(
					"remove_favorite_category_for_user" as never,
					{ p_category_id: numericCategoryId } as never,
				);

				if (removeError) {
					return apiError({
						route,
						message: "Error updating favorite status",
						error: removeError,
						operation: "remove_favorite_category",
						userId,
						extra: { categoryId },
					});
				}
			}
		}

		console.log(`[${route}] Category updated:`, {
			categoryId: categoryData[0].id,
			categoryName: categoryData[0].category_name,
		});

		// Trigger on-demand revalidation for public categories (non-blocking)
		// This ensures public pages reflect all changes immediately:
		// - Visibility changes (public↔private)
		// - View settings (columns, sort order, card content)
		// - Category name, icon, or color changes
		// Don't await - failed revalidation shouldn't fail the mutation
		if (categoryData[0].is_public || updateData.is_public !== undefined) {
			// Fetch user profile to get username for revalidation path
			const { data: profileData, error: profileError } = await supabase
				.from(PROFILES)
				.select("user_name")
				.eq("id", userId)
				.single();

			if (profileError) {
				console.error(`[${route}] Failed to load profile for revalidation:`, {
					error: profileError,
					userId,
					categoryId: categoryData[0].id,
				});
			} else if (profileData?.user_name) {
				// Fire-and-forget revalidation - errors handled internally by helper
				void revalidatePublicCategoryPage(
					profileData.user_name,
					categoryData[0].category_slug,
					{
						operation: "update_category",
						userId,
						categoryId: categoryData[0].id,
					},
				);
			}
		}

		return categoryData;
	},
});
