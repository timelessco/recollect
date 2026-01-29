import * as Sentry from "@sentry/nextjs";
import { type SupabaseClient } from "@supabase/supabase-js";

import { type CategoriesData } from "../types/apiTypes";

import { BOOKMARK_CATEGORIES_TABLE_NAME, MAIN_TABLE_NAME } from "./constants";

export type BookmarkWithCategoryId = {
	url: string;
	category_id: number;
	category_name: string | null;
	[key: string]: unknown;
};

type DeduplicateBookmarksResult = {
	bookmarksToSanitize: BookmarkWithCategoryId[];
	duplicatesRemoved: number;
	existing: number;
};

export interface DeduplicateBookmarksProps {
	bookmarks: Array<{ url: string; category_name: string | null }>;
	categoriesData: CategoriesData[];
	route: string;
	supabase: SupabaseClient;
	userId: string;
}

/**
 * Deduplicate bookmarks by URL+category_name and filter out existing ones from database.
 * @param props - Function parameters
 * @param props.bookmarks - Array of bookmarks to deduplicate
 * @param props.categoriesData - Categories data for mapping category_name to category_id
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @param props.userId - User ID
 * @returns Deduplicated bookmarks ready for sanitization
 */
export async function deduplicateBookmarks(
	props: DeduplicateBookmarksProps,
): Promise<DeduplicateBookmarksResult> {
	const { bookmarks, categoriesData, route, supabase, userId } = props;
	//  Filter duplicates by URL + category_name (before sanitization)
	const seenBookmarks = new Set<string>();
	const uniqueBookmarks = bookmarks.filter((bookmark) => {
		const key = `${bookmark.url}_${bookmark.category_name || "null"}`;
		if (seenBookmarks.has(key)) {
			// Skip duplicate
			return false;
		}

		seenBookmarks.add(key);
		// Keep first occurrence
		return true;
	});

	const duplicatesRemoved = bookmarks.length - uniqueBookmarks.length;
	if (duplicatesRemoved > 0) {
		console.warn(`[${route}] Removed duplicates by URL+category_name:`, {
			duplicatesRemoved,
			totalBookmarks: bookmarks.length,
			uniqueBookmarks: uniqueBookmarks.length,
			userId,
		});
	}

	//  Map category_name to category_id for checking existing bookmarks
	const bookmarksWithCategoryId = uniqueBookmarks.map((bookmark) => {
		const category_id =
			categoriesData.find(
				(category) => category.category_name === bookmark.category_name,
			)?.id || 0;
		return {
			...bookmark,
			category_id,
		};
	}) as BookmarkWithCategoryId[];

	// Deduplicate again by URL+category_id after mapping
	// The constraint is on (url, category_id), not (url, category_name)
	// Multiple category_names might map to the same category_id
	const seenByUrlCategoryId = new Set<string>();
	const deduplicatedByCategoryId = bookmarksWithCategoryId.filter(
		(bookmark) => {
			const key = `${bookmark.url}_${bookmark.category_id}`;
			if (seenByUrlCategoryId.has(key)) {
				return false;
			}

			seenByUrlCategoryId.add(key);
			return true;
		},
	);

	const duplicatesAfterMapping =
		bookmarksWithCategoryId.length - deduplicatedByCategoryId.length;

	if (duplicatesAfterMapping > 0) {
		console.warn(
			`[${route}] Removed duplicates by URL+category_id after mapping:`,
			{
				duplicatesRemoved: duplicatesAfterMapping,
				beforeMapping: bookmarksWithCategoryId.length,
				afterMapping: deduplicatedByCategoryId.length,
				userId,
			},
		);
	}

	// Check existing bookmarks in database
	// IMPORTANT: Check ALL bookmarks, not just raindrop ones
	// The constraint applies to all bookmarks, so we must check all of them
	// Use bookmark_categories junction table instead of deprecated everything.category_id
	const urlsToCheck = deduplicatedByCategoryId.map((b) => b.url);
	const categoryIdsToCheck = [
		...new Set(deduplicatedByCategoryId.map((b) => b.category_id)),
	];

	// Separate categorized (category_id > 0) and uncategorized (category_id === 0) bookmarks
	const categorizedCategoryIds = categoryIdsToCheck.filter((id) => id > 0);
	const hasUncategorized = categoryIdsToCheck.includes(0);

	// Batch queries to avoid "URI too long" error
	// Supabase/PostgreSQL has limits on query string length
	const BATCH_SIZE = 120;
	const allExistingBookmarks: Array<{ url: string; category_id: number }> = [];

	if (urlsToCheck.length > 0) {
		// Process URLs in batches
		for (
			let batchIndex = 0;
			batchIndex < urlsToCheck.length;
			batchIndex += BATCH_SIZE
		) {
			const urlBatch = urlsToCheck.slice(batchIndex, batchIndex + BATCH_SIZE);
			const batchNumber = Math.floor(batchIndex / BATCH_SIZE) + 1;
			const totalBatches = Math.ceil(urlsToCheck.length / BATCH_SIZE);

			// Build promises for independent queries (Query 1 and Query 2) to run in parallel
			const parallelQueries: Array<Promise<unknown>> = [];

			// Query 1: For categorized bookmarks (category_id > 0): Query via junction table
			if (categorizedCategoryIds.length > 0) {
				const categorizedQueryPromise = (async () => {
					const { data: categorizedResults, error: categorizedError } =
						await supabase
							.from(MAIN_TABLE_NAME)
							.select("url, bookmark_categories!inner(category_id)")
							.in("url", urlBatch)
							.eq("user_id", userId)
							.in("bookmark_categories.category_id", categorizedCategoryIds)
							.eq("bookmark_categories.user_id", userId);

					if (categorizedError) {
						console.error(
							`[${route}] Error checking existing categorized bookmarks (batch ${batchNumber}/${totalBatches}):`,
							{
								error: categorizedError,
								userId,
								batchStart: batchIndex,
								batchEnd: Math.min(batchIndex + BATCH_SIZE, urlsToCheck.length),
							},
						);
						Sentry.captureException(categorizedError, {
							tags: {
								operation: "check_existing_categorized_bookmarks",
								userId,
							},
							extra: {
								batchNumber,
								totalBatches,
								batchStart: batchIndex,
								batchEnd: Math.min(batchIndex + BATCH_SIZE, urlsToCheck.length),
								urlsToCheckCount: urlsToCheck.length,
								categoryIdsToCheckCount: categorizedCategoryIds.length,
							},
						});
						throw new Error("Failed to check existing categorized bookmarks");
					}

					return categorizedResults;
				})();

				parallelQueries.push(categorizedQueryPromise);
			}

			// Query 2: For uncategorized bookmarks (category_id === 0): Check bookmarks with no junction entries
			let allBookmarksWithUrls: Array<{ id: number; url: string }> | null =
				null;
			if (hasUncategorized) {
				const uncategorizedQueryPromise = (async () => {
					const { data: bookmarksData, error: allBookmarksError } =
						await supabase
							.from(MAIN_TABLE_NAME)
							.select("id, url")
							.in("url", urlBatch)
							.eq("user_id", userId);

					if (allBookmarksError) {
						console.error(
							`[${route}] Error checking existing uncategorized bookmarks (batch ${batchNumber}/${totalBatches}):`,
							{
								error: allBookmarksError,
								userId,
								batchStart: batchIndex,
								batchEnd: Math.min(batchIndex + BATCH_SIZE, urlsToCheck.length),
							},
						);
						Sentry.captureException(allBookmarksError, {
							tags: {
								operation: "check_existing_uncategorized_bookmarks",
								userId,
							},
							extra: {
								batchNumber,
								totalBatches,
								batchStart: batchIndex,
								batchEnd: Math.min(batchIndex + BATCH_SIZE, urlsToCheck.length),
								urlsToCheckCount: urlsToCheck.length,
							},
						});
						throw new Error("Failed to check existing uncategorized bookmarks");
					}

					return bookmarksData;
				})();

				parallelQueries.push(uncategorizedQueryPromise);
			}

			// Execute parallel queries
			const parallelResults = await Promise.all(parallelQueries);

			// Process Query 1 results (categorized bookmarks)
			if (categorizedCategoryIds.length > 0) {
				const categorizedResults = parallelResults[0] as Array<{
					url: string;
					bookmark_categories: Array<{ category_id: number }> | null;
				}> | null;

				if (categorizedResults && categorizedResults.length > 0) {
					// Transform results to match expected format
					// categorizedResults is an array where each item has url and bookmark_categories array
					for (const result of categorizedResults) {
						const bookmarkCategories = result.bookmark_categories as Array<{
							category_id: number;
						}> | null;
						if (bookmarkCategories && bookmarkCategories.length > 0) {
							for (const bc of bookmarkCategories) {
								allExistingBookmarks.push({
									url: result.url,
									category_id: bc.category_id,
								});
							}
						}
					}
				}
			}

			// Process Query 2 results and Query 3 (uncategorized bookmarks)
			if (hasUncategorized) {
				// Extract Query 2 result from parallel results
				// If Query 1 also ran, Query 2 is at index 1, otherwise at index 0
				const resultIndex = categorizedCategoryIds.length > 0 ? 1 : 0;
				allBookmarksWithUrls = parallelResults[resultIndex] as Array<{
					id: number;
					url: string;
				}> | null;

				if (allBookmarksWithUrls && allBookmarksWithUrls.length > 0) {
					// Query 3: Get bookmark IDs that have categories (to exclude them)
					// This query depends on Query 2 results, so it must run sequentially
					const bookmarkIdsWithCategories = new Set<number>();
					const bookmarkIds = allBookmarksWithUrls.map((b) => b.id);
					const {
						data: bookmarksWithCategories,
						error: bookmarksWithCategoriesError,
					} = await supabase
						.from(BOOKMARK_CATEGORIES_TABLE_NAME)
						.select("bookmark_id")
						.in("bookmark_id", bookmarkIds)
						.eq("user_id", userId);

					if (bookmarksWithCategoriesError) {
						console.error(
							`[${route}] Error checking bookmarks with categories (batch ${batchNumber}/${totalBatches}):`,
							{
								error: bookmarksWithCategoriesError,
								userId,
								batchStart: batchIndex,
								batchEnd: Math.min(batchIndex + BATCH_SIZE, urlsToCheck.length),
							},
						);
						Sentry.captureException(bookmarksWithCategoriesError, {
							tags: {
								operation: "check_bookmarks_with_categories",
								userId,
							},
							extra: {
								batchNumber,
								totalBatches,
								batchStart: batchIndex,
								batchEnd: Math.min(batchIndex + BATCH_SIZE, urlsToCheck.length),
								bookmarkIdsCount: bookmarkIds.length,
							},
						});
						throw new Error("Failed to check bookmarks with categories");
					}

					if (bookmarksWithCategories) {
						for (const bc of bookmarksWithCategories) {
							bookmarkIdsWithCategories.add(bc.bookmark_id);
						}
					}

					// Bookmarks without categories are uncategorized (category_id === 0)
					for (const bookmark of allBookmarksWithUrls) {
						if (!bookmarkIdsWithCategories.has(bookmark.id)) {
							allExistingBookmarks.push({
								url: bookmark.url,
								category_id: 0,
							});
						}
					}
				}
			}
		}
	}

	//  Filter out existing bookmarks
	const existingMap = new Map<string, boolean>();
	if (allExistingBookmarks.length > 0) {
		for (const existingBookmark of allExistingBookmarks) {
			const key = `${existingBookmark.url}_${existingBookmark.category_id}`;
			existingMap.set(key, true);
		}

		console.log(`[${route}] Found existing bookmarks in database:`, {
			existingCount: allExistingBookmarks.length,
			userId,
		});
	}

	const bookmarksToSanitize = deduplicatedByCategoryId.filter((bookmark) => {
		const key = `${bookmark.url}_${bookmark.category_id}`;

		// Only keep if not existing
		return !existingMap.has(key);
	});

	const existing = deduplicatedByCategoryId.length - bookmarksToSanitize.length;
	if (existing > 0) {
		console.log(`[${route}] Removed existing bookmarks:`, {
			existing,
			userId,
		});
	}

	return {
		bookmarksToSanitize,
		duplicatesRemoved: duplicatesRemoved + duplicatesAfterMapping,
		existing,
	};
}
