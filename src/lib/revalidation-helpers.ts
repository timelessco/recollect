import * as Sentry from "@sentry/nextjs";

import type { Database } from "@/types/database-generated.types";

import { env } from "@/env/server";
import { createServerServiceClient } from "@/lib/supabase/service";
import { getBaseUrl, NEXT_API_URL } from "@/utils/constants";
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
    categoryId?: number;
    operation?: string;
    userId?: string;
  },
): Promise<void> {
  const path = `/public/${userName}/${categorySlug}`;

  // Deduplicate concurrent revalidations for the same path
  const existing = pendingRevalidations.get(path);
  if (existing) {
    console.log("[revalidatePublicCategoryPage] Revalidation already in progress:", {
      context,
      path,
    });
    await existing;
    return;
  }

  const revalidationPromise = (async () => {
    try {
      const revalidateUrl = `${getBaseUrl()}${NEXT_API_URL}/v2/revalidate`;
      const secret = env.REVALIDATE_SECRET_TOKEN;

      if (!secret) {
        console.warn(
          "[revalidatePublicCategoryPage] REVALIDATE_SECRET_TOKEN not configured - skipping revalidation",
          { context, path },
        );
        return;
      }

      console.log("[revalidatePublicCategoryPage] Starting revalidation:", {
        context,
        path,
      });

      // Retry logic: 3 attempts with exponential backoff
      // 10 second timeout per attempt
      let lastError: Error | null = null;
      const maxRetries = 3;
      const timeoutMs = 10_000;

      for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, timeoutMs);

          const [error, response] = await vet(() =>
            fetch(revalidateUrl, {
              body: JSON.stringify({ path }),
              cache: "no-store",
              headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
              },
              method: "POST",
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
              context,
              path,
            },
          );
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const isLastAttempt = attempt === maxRetries;

          if (isLastAttempt) {
            console.error(`[revalidatePublicCategoryPage] All retry attempts failed:`, {
              attempts: maxRetries,
              context,
              error,
              path,
            });
          } else {
            // Exponential backoff: 500ms, 1000ms, 2000ms
            const delayMs = 500 * 2 ** (attempt - 1);
            console.warn(
              `[revalidatePublicCategoryPage] Attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms:`,
              {
                error: lastError.message,
                path,
              },
            );
            // eslint-disable-next-line promise/avoid-new -- wrapping setTimeout callback API
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
        extra: { categorySlug, context, maxRetries, path, userName },
        tags: {
          context: context?.operation,
          operation: "revalidate_public_category",
          userId: context?.userId,
        },
      });
    } catch (error) {
      console.error("[revalidatePublicCategoryPage] Unexpected error during revalidation:", {
        categorySlug,
        context,
        error,
        userName,
      });
      Sentry.captureException(error, {
        extra: { categorySlug, context, userName },
        tags: {
          context: context?.operation,
          operation: "revalidate_public_category_unexpected",
        },
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
  categorySlug: string;
  isPublic: boolean;
  userName: string;
} | null> {
  try {
    console.log("[getCategoryDetailsForRevalidation] Fetching category:", {
      categoryId,
      context,
    });

    const supabase = createServerServiceClient();

    const { data: categoryData, error } = await supabase
      .from("categories")
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
          user_id: { user_name: null | string };
        }
      >();

    console.log("[getCategoryDetailsForRevalidation] Query result:", {
      categoryData,
      categoryId,
      error,
    });

    if (error) {
      console.warn("[getCategoryDetailsForRevalidation] Failed to fetch category:", {
        categoryId,
        context,
        error,
      });
      return null;
    }

    const userName = categoryData.user_id?.user_name;
    console.log("[getCategoryDetailsForRevalidation] Extracted data:", {
      categoryId,
      categorySlug: categoryData.category_slug,
      isPublic: categoryData.is_public,
      rawUserId: categoryData.user_id,
      userName,
    });

    if (!categoryData.is_public || !userName) {
      console.log("[getCategoryDetailsForRevalidation] Skipping - not public or no username:", {
        categoryId,
        isPublic: categoryData.is_public,
        userName,
      });
      return null;
    }

    return {
      categorySlug: categoryData.category_slug,
      isPublic: categoryData.is_public,
      userName,
    };
  } catch (error) {
    console.error("[getCategoryDetailsForRevalidation] Unexpected error:", error);
    Sentry.captureException(error, {
      extra: { categoryId, context },
      tags: {
        context: context?.operation,
        operation: "get_category_for_revalidation",
      },
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
    categoryDetails,
    categoryId,
  });

  await revalidatePublicCategoryPage(categoryDetails.userName, categoryDetails.categorySlug, {
    ...context,
    categoryId,
  });
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
    categoryIds.map((categoryId) => revalidateCategoryIfPublic(categoryId, context)),
  );

  console.log("[revalidateCategoriesIfPublic] Completed for:", { categoryIds });
}
