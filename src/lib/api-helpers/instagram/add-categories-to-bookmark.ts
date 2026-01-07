import { type SupabaseClient } from "@supabase/supabase-js";

import { type InstagramMetaData } from "@/lib/api-helpers/instagram/schemas";
import { type Database } from "@/types/database-generated.types";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	INSTAGRAM_COLLECTION_DEFAULTS,
} from "@/utils/constants";

export interface AddBookmarkToCategoriesProps {
	bookmark: {
		id: number;
		user_id: string;
		meta_data: InstagramMetaData | null;
	};
	route: string;
	supabase: SupabaseClient<Database>;
}

export interface AddCategoriesToBookmarksBatchProps {
	bookmarks: Array<{
		id: number;
		user_id: string;
		meta_data: InstagramMetaData | null;
	}>;
	route: string;
	supabase: SupabaseClient<Database>;
}

export interface BatchProcessingResult {
	// bookmark IDs
	successful: number[];
	failed: Array<{ bookmarkId: number; error: string }>;
}

/**
 * Batch processes multiple bookmarks to add them to their respective categories.
 * Optimized to reduce N queries to 3 queries total (fetch all, upsert all, verify all).
 * @param props - Parameters object
 * @param props.bookmarks - Array of bookmarks to process
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @returns Promise that resolves with successful and failed bookmark IDs
 */
export async function addCategoriesToBookmarks(
	props: AddCategoriesToBookmarksBatchProps,
): Promise<BatchProcessingResult> {
	const { bookmarks, route, supabase } = props;

	const successful: number[] = [];
	const failed: Array<{ bookmarkId: number; error: string }> = [];

	if (bookmarks.length === 0) {
		return { successful: [], failed: [] };
	}

	// Collect all unique category names from all bookmarks
	const categoryNameSet = new Set<string>();
	// bookmarkId -> categoryNames
	const bookmarkCategoryMap = new Map<number, string[]>();

	for (const bookmark of bookmarks) {
		const metaData = bookmark.meta_data as InstagramMetaData;
		const collectionNames = metaData?.saved_collection_names;

		if (
			!collectionNames ||
			!Array.isArray(collectionNames) ||
			collectionNames.length === 0
		) {
			// No categories to link - consider successful
			successful.push(bookmark.id);
			continue;
		}

		const uniqueCategoryNames = [
			...new Set(collectionNames.map((name) => name.trim()).filter(Boolean)),
		];

		if (uniqueCategoryNames.length === 0) {
			successful.push(bookmark.id);
			continue;
		}

		// Store mapping for later
		bookmarkCategoryMap.set(bookmark.id, uniqueCategoryNames);
		for (const name of uniqueCategoryNames) {
			categoryNameSet.add(name);
		}
	}

	if (categoryNameSet.size === 0) {
		// All bookmarks had no categories
		return { successful, failed };
	}

	// Single query to fetch all categories (grouped by user_id)
	const userIds = [...new Set(bookmarks.map((b) => b.user_id))];
	const { data: allCategories, error: categoriesError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select("id, category_name, user_id")
		.in("user_id", userIds)
		.eq("icon", INSTAGRAM_COLLECTION_DEFAULTS.ICON)
		.eq("icon_color", INSTAGRAM_COLLECTION_DEFAULTS.ICON_COLOR)
		.in("category_name", Array.from(categoryNameSet));

	if (categoriesError) {
		console.error(
			`[${route}] Failed to fetch categories for batch:`,
			categoriesError,
		);
		// If category fetch fails, all bookmarks fail
		return {
			successful: bookmarks
				.filter((b) => !bookmarkCategoryMap.has(b.id))
				.map((b) => b.id),
			failed: Array.from(bookmarkCategoryMap.keys()).map((bookmarkId) => ({
				bookmarkId,
				error: categoriesError.message,
			})),
		};
	}

	if (!allCategories || allCategories.length === 0) {
		console.log(
			`[${route}] No categories found for batch. Category names:`,
			Array.from(categoryNameSet),
		);
		// No categories found, mark as failed
		return {
			successful: bookmarks
				.filter((b) => !bookmarkCategoryMap.has(b.id))
				.map((b) => b.id),
			failed: Array.from(bookmarkCategoryMap.keys()).map((bookmarkId) => ({
				bookmarkId,
				error: "No matching categories found",
			})),
		};
	}

	// Build category lookup map (user_id + category_name -> category_id)
	// "userId:categoryName" -> categoryId
	const categoryMap = new Map<string, number>();
	for (const category of allCategories) {
		if (category.id && category.category_name && category.user_id) {
			categoryMap.set(
				`${category.user_id}:${category.category_name}`,
				category.id,
			);
		}
	}

	// Build all bookmark-category pairs in memory
	const allPairs: Array<{
		bookmark_id: number;
		category_id: number;
		user_id: string;
	}> = [];

	// bookmarkId -> categoryIds
	const bookmarkPairsMap = new Map<number, number[]>();

	for (const bookmark of bookmarks) {
		const categoryNames = bookmarkCategoryMap.get(bookmark.id);
		if (!categoryNames) {
			continue;
		}

		const categoryIds: number[] = [];
		for (const categoryName of categoryNames) {
			const categoryId = categoryMap.get(`${bookmark.user_id}:${categoryName}`);
			if (categoryId) {
				categoryIds.push(categoryId);
				allPairs.push({
					bookmark_id: bookmark.id,
					category_id: categoryId,
					user_id: bookmark.user_id,
				});
			}
		}

		if (categoryIds.length > 0) {
			bookmarkPairsMap.set(bookmark.id, categoryIds);
		} else {
			// No matching categories found for this bookmark
			failed.push({
				bookmarkId: bookmark.id,
				error: "No matching categories found",
			});
		}
	}

	if (allPairs.length === 0) {
		console.log(`[${route}] No valid category pairs to insert for batch`);
		return {
			successful: bookmarks
				.filter((b) => !bookmarkCategoryMap.has(b.id))
				.map((b) => b.id),
			failed: Array.from(bookmarkCategoryMap.keys()).map((bookmarkId) => ({
				bookmarkId,
				error: "No valid category pairs",
			})),
		};
	}

	// Bulk upsert all pairs
	const { error: upsertError } = await supabase
		.from(BOOKMARK_CATEGORIES_TABLE_NAME)
		.upsert(allPairs, {
			onConflict: "bookmark_id,category_id",
			ignoreDuplicates: true,
		});

	if (upsertError) {
		console.error(`[${route}] Bulk upsert failed for batch:`, upsertError);
		// Entire batch failed
		return {
			successful: bookmarks
				.filter((b) => !bookmarkCategoryMap.has(b.id))
				.map((b) => b.id),
			failed: Array.from(bookmarkCategoryMap.keys()).map((bookmarkId) => ({
				bookmarkId,
				error: upsertError.message,
			})),
		};
	}

	// Verify which pairs were actually inserted
	const bookmarkIds = Array.from(bookmarkPairsMap.keys());
	const { data: insertedPairs, error: verifyError } = await supabase
		.from(BOOKMARK_CATEGORIES_TABLE_NAME)
		.select("bookmark_id, category_id")
		.in("bookmark_id", bookmarkIds)
		.in(
			"category_id",
			Array.from(new Set(allPairs.map((pair) => pair.category_id))),
		);

	if (verifyError) {
		console.warn(`[${route}] Failed to verify inserted pairs:`, verifyError);
		// Assume all succeeded if verification fails (optimistic)
		return {
			successful: bookmarks.map((b) => b.id),
			failed: [],
		};
	}

	// Step 7: Compare expected vs actual
	const insertedSet = new Set<string>();
	for (const pair of insertedPairs || []) {
		insertedSet.add(`${pair.bookmark_id}:${pair.category_id}`);
	}

	// Check each bookmark
	for (const bookmarkId of bookmarkIds) {
		const expectedCategoryIds = bookmarkPairsMap.get(bookmarkId) || [];
		const allFound = expectedCategoryIds.every((categoryId) =>
			insertedSet.has(`${bookmarkId}:${categoryId}`),
		);

		if (allFound) {
			successful.push(bookmarkId);
		} else {
			failed.push({
				bookmarkId,
				error: "Some category pairs were not inserted",
			});
		}
	}

	console.log(
		`[${route}] Batch processing complete: ${successful.length} successful, ${failed.length} failed`,
	);

	return { successful, failed };
}
