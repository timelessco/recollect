import * as Sentry from "@sentry/nextjs";

import { createServerServiceClient } from "@/lib/supabase/service";
import { type Database } from "@/types/database-generated.types";
import {
	CATEGORIES_TABLE_NAME,
	getBaseUrl,
	NEXT_API_URL,
} from "@/utils/constants";
import { vet } from "@/utils/try";

/**
 * Revalidates a public category page using on-demand ISR.
 * This is a non-blocking operation - failures are logged but don't affect the main API response.
 * @param userName - The user's username (slug)
 * @param categorySlug - The category slug
 * @param context - Additional context for logging
 * @param context.operation - The operation that triggered the revalidation
 * @param context.userId - The user ID that triggered the revalidation
 * @param context.categoryId - The category ID that triggered the revalidation
 */
export async function revalidatePublicCategoryPage(
	userName: string,
	categorySlug: string,
	context?: {
		operation?: string;
		userId?: string;
		categoryId?: number;
	},
): Promise<void> {
	try {
		const path = `/public/${userName}/${categorySlug}`;
		const revalidateUrl = `${getBaseUrl()}${NEXT_API_URL}/revalidate`;
		const secret = process.env.REVALIDATE_SECRET_TOKEN;

		if (!secret) {
			console.warn(
				"[revalidatePublicCategoryPage] REVALIDATE_SECRET_TOKEN not configured - skipping revalidation",
				{ path, context },
			);
			return;
		}

		console.log("[revalidatePublicCategoryPage] Starting revalidation:", {
			path,
			context,
		});

		const [error, response] = await vet(() =>
			fetch(revalidateUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${secret}`,
				},
				body: JSON.stringify({ path }),
			}),
		);

		if (error) {
			console.error("[revalidatePublicCategoryPage] Network error:", {
				error,
				path,
				context,
			});
			Sentry.captureException(error, {
				tags: {
					operation: "revalidate_public_category",
					context: context?.operation,
				},
				extra: { path, userName, categorySlug, context },
			});
			return;
		}

		if (!response.ok) {
			const text = await response.text();
			console.error("[revalidatePublicCategoryPage] Revalidation failed:", {
				status: response.status,
				statusText: response.statusText,
				body: text,
				path,
				context,
			});
			Sentry.captureMessage("ISR revalidation failed", {
				level: "warning",
				tags: {
					operation: "revalidate_public_category",
					context: context?.operation,
				},
				extra: {
					status: response.status,
					path,
					userName,
					categorySlug,
					context,
				},
			});
			return;
		}

		console.log("[revalidatePublicCategoryPage] Successfully revalidated:", {
			path,
			context,
		});
	} catch (error) {
		console.error(
			"[revalidatePublicCategoryPage] Unexpected error during revalidation:",
			{
				error,
				userName,
				categorySlug,
				context,
			},
		);
		Sentry.captureException(error, {
			tags: {
				operation: "revalidate_public_category_unexpected",
				context: context?.operation,
			},
			extra: { userName, categorySlug, context },
		});
	}
}

/**
 * Fetches category details including public status and user information.
 * Returns null if category not found or on error.
 */
export async function getCategoryDetailsForRevalidation(
	categoryId: number,
	context?: { operation?: string },
): Promise<{
	isPublic: boolean;
	categorySlug: string;
	userName: string;
} | null> {
	try {
		const supabase = await createServerServiceClient();

		const { data: categoryData, error } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select(
				`
				is_public,
				category_slug,
				user_id (
					user_name
				)
			`,
			)
			.eq("id", categoryId)
			.single<
				Database["public"]["Tables"]["categories"]["Row"] & {
					user_id: { user_name: string | null };
				}
			>();

		if (error) {
			console.warn(
				"[getCategoryDetailsForRevalidation] Failed to fetch category:",
				{
					error,
					categoryId,
					context,
				},
			);
			return null;
		}

		const userName = categoryData.user_id?.user_name;
		if (!categoryData.is_public || !userName) {
			// Category is not public or user has no username - no revalidation needed
			return null;
		}

		return {
			isPublic: categoryData.is_public,
			categorySlug: categoryData.category_slug,
			userName,
		};
	} catch (error) {
		console.error(
			"[getCategoryDetailsForRevalidation] Unexpected error:",
			error,
		);
		Sentry.captureException(error, {
			tags: {
				operation: "get_category_for_revalidation",
				context: context?.operation,
			},
			extra: { categoryId, context },
		});
		return null;
	}
}

/**
 * Revalidates a category if it's public. Non-blocking operation.
 * Fetches category details and triggers revalidation if needed.
 * @param categoryId - The category ID to check and revalidate
 * @param context - Additional context for logging
 * @param context.operation - The operation that triggered the revalidation
 * @param context.userId - The user ID that triggered the revalidation
 */
export async function revalidateCategoryIfPublic(
	categoryId: number,
	context?: {
		operation?: string;
		userId?: string;
	},
): Promise<void> {
	const categoryDetails = await getCategoryDetailsForRevalidation(categoryId, {
		operation: context?.operation,
	});

	if (!categoryDetails) {
		// Category not public or not found - no revalidation needed
		return;
	}

	await revalidatePublicCategoryPage(
		categoryDetails.userName,
		categoryDetails.categorySlug,
		{
			...context,
			categoryId,
		},
	);
}

/**
 * Revalidates multiple categories if they are public. Non-blocking operation.
 * Useful when a bookmark is added/removed from multiple categories.
 * @param categoryIds - Array of category IDs to check and revalidate
 * @param context - Additional context for logging
 * @param context.operation - The operation that triggered the revalidation
 * @param context.userId - The user ID that triggered the revalidation
 */
export async function revalidateCategoriesIfPublic(
	categoryIds: number[],
	context?: {
		operation?: string;
		userId?: string;
	},
): Promise<void> {
	// Fire all revalidations in parallel without awaiting
	void Promise.all(
		categoryIds.map((categoryId) =>
			revalidateCategoryIfPublic(categoryId, context),
		),
	);
}
