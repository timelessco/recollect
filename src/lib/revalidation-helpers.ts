import * as Sentry from "@sentry/nextjs";

import { createServerServiceClient } from "@/lib/supabase/service";
import { type Database } from "@/types/database-generated.types";
import {
	CATEGORIES_TABLE_NAME,
	getBaseUrl,
	NEXT_API_URL,
} from "@/utils/constants";
import { vet } from "@/utils/try";

// Track in-flight revalidation requests to prevent duplicate calls
const pendingRevalidations = new Map<string, Promise<void>>();

/**
 * Revalidates a public category page using on-demand ISR with retry logic.
 * Includes timeout handling, exponential backoff retries, and request deduplication.
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
	const path = `/public/${userName}/${categorySlug}`;

	// Deduplicate concurrent revalidations for the same path
	const existing = pendingRevalidations.get(path);
	if (existing) {
		console.log(
			"[revalidatePublicCategoryPage] Revalidation already in progress:",
			{
				path,
				context,
			},
		);
		await existing;
		return;
	}

	const revalidationPromise = (async () => {
		try {
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

			// Retry logic: 3 attempts with exponential backoff
			// 10 second timeout per attempt
			let lastError: Error | null = null;
			const maxRetries = 3;
			const timeoutMs = 10_000;

			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					// Create AbortController for timeout
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

					const [error, response] = await vet(() =>
						fetch(revalidateUrl, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${secret}`,
							},
							body: JSON.stringify({ path }),
							cache: "no-store",
							signal: controller.signal,
						}),
					);

					clearTimeout(timeoutId);

					if (error) {
						throw error;
					}

					if (!response.ok) {
						const text = await response.text();
						throw new Error(
							`Revalidation failed: ${response.status} ${response.statusText} - ${text}`,
						);
					}

					console.log(
						`[revalidatePublicCategoryPage] Successfully revalidated (attempt ${attempt}/${maxRetries}):`,
						{
							path,
							context,
						},
					);
					return;
				} catch (error) {
					lastError = error as Error;
					const isLastAttempt = attempt === maxRetries;

					if (isLastAttempt) {
						console.error(
							`[revalidatePublicCategoryPage] All retry attempts failed:`,
							{
								error,
								path,
								context,
								attempts: maxRetries,
							},
						);
					} else {
						// Exponential backoff: 500ms, 1000ms, 2000ms
						const delayMs = 500 * 2 ** (attempt - 1);
						console.warn(
							`[revalidatePublicCategoryPage] Attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms:`,
							{
								error: (error as Error).message,
								path,
							},
						);
						await new Promise<void>((resolve) => {
							setTimeout(() => {
								resolve();
							}, delayMs);
						});
					}
				}
			}

			// If we get here, all retries failed
			Sentry.captureException(lastError, {
				tags: {
					operation: "revalidate_public_category",
					context: context?.operation,
					userId: context?.userId,
				},
				extra: { path, userName, categorySlug, context, maxRetries },
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
		} finally {
			// Clean up pending revalidation
			pendingRevalidations.delete(path);
		}
	})();

	pendingRevalidations.set(path, revalidationPromise);
	await revalidationPromise;
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
		console.log("[getCategoryDetailsForRevalidation] Fetching category:", {
			categoryId,
			context,
		});

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

		console.log("[getCategoryDetailsForRevalidation] Query result:", {
			categoryId,
			categoryData,
			error,
		});

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
		console.log("[getCategoryDetailsForRevalidation] Extracted data:", {
			categoryId,
			isPublic: categoryData.is_public,
			categorySlug: categoryData.category_slug,
			userName,
			rawUserId: categoryData.user_id,
		});

		if (!categoryData.is_public || !userName) {
			console.log(
				"[getCategoryDetailsForRevalidation] Skipping - not public or no username:",
				{
					categoryId,
					isPublic: categoryData.is_public,
					userName,
				},
			);
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
	console.log("[revalidateCategoryIfPublic] Called with:", {
		categoryId,
		context,
	});

	const categoryDetails = await getCategoryDetailsForRevalidation(categoryId, {
		operation: context?.operation,
	});

	if (!categoryDetails) {
		console.log("[revalidateCategoryIfPublic] No category details, skipping:", {
			categoryId,
		});
		return;
	}

	console.log("[revalidateCategoryIfPublic] Triggering revalidation:", {
		categoryId,
		categoryDetails,
	});

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
	console.log("[revalidateCategoriesIfPublic] Called with:", {
		categoryIds,
		context,
	});

	// Process all revalidations in parallel and await completion
	await Promise.all(
		categoryIds.map((categoryId) =>
			revalidateCategoryIfPublic(categoryId, context),
		),
	);

	console.log("[revalidateCategoriesIfPublic] Completed for:", { categoryIds });
}
