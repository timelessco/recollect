import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";

import { type InstagramMetaData } from "@/lib/api-helpers/instagram/schemas";
import { type Database } from "@/types/database-generated.types";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
} from "@/utils/constants";

export type UniqueCategoriesWithNameAndId = Map<string, number>;

export interface FetchUniqueCategoriesWithNameAndIdProps {
	bookmarks: Array<{
		meta_data: InstagramMetaData;
	}>;
	route: string;
	supabase: SupabaseClient<Database>;
	userId: string;
}

/**
 * Collects all unique category names from bookmarks and fetches their IDs from the database.
 * Returns a map of category name to category ID.
 * @param props - Parameters object
 * @param props.bookmarks - Array of bookmarks with collection names in meta_data
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @param props.userId - User ID
 * @returns Promise that resolves to an object with uniqueCategoriesWithNameAndId map and error (null on success)
 */
export async function fetchUniqueCategoriesWithNameAndId(
	props: FetchUniqueCategoriesWithNameAndIdProps,
): Promise<{
	uniqueCategoriesWithNameAndId: UniqueCategoriesWithNameAndId;
	error: PostgrestError | null;
}> {
	const { bookmarks, route, supabase, userId } = props;

	// Collect all unique category names from all bookmarks
	const allCategoryNames = new Set<string>();
	for (const bookmark of bookmarks) {
		const metaData = bookmark.meta_data as InstagramMetaData;
		const collectionNames = metaData?.saved_collection_names;
		if (collectionNames && Array.isArray(collectionNames)) {
			for (const name of collectionNames) {
				const trimmed = name.trim();
				if (trimmed) {
					allCategoryNames.add(trimmed);
				}
			}
		}
	}

	console.log(
		`[${route}] Found ${allCategoryNames.size} unique category names`,
		{
			allCategoryNames: Array.from(allCategoryNames),
		},
	);

	// Single query to fetch all categories at once
	const uniqueCategoriesWithNameAndId: Map<string, number> = new Map();
	if (allCategoryNames.size > 0) {
		const { data: allCategories, error: categoriesError } = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("id, category_name")
			.eq("user_id", userId)
			.eq("icon", "bookmark")
			.eq("icon_color", "#ffffff")
			.in("category_name", Array.from(allCategoryNames));

		if (categoriesError) {
			return { uniqueCategoriesWithNameAndId, error: categoriesError };
		}

		if (allCategories) {
			for (const cat of allCategories) {
				if (cat.category_name) {
					uniqueCategoriesWithNameAndId.set(cat.category_name, cat.id);
				}
			}
		}
	}

	return { uniqueCategoriesWithNameAndId, error: null };
}

export interface AddCategoriesToBookmarkByNameProps {
	bookmarks: Array<{
		id: number;
		meta_data: InstagramMetaData;
	}>;
	route: string;
	supabase: SupabaseClient<Database>;
	uniqueCategoriesWithNameAndId: UniqueCategoriesWithNameAndId;
	userId: string;
}

/**
 * Adds bookmarks to categories using bulk insert.
 * Builds bookmark-category pairs from bookmarks and their collection names, then performs a single bulk upsert.
 * @param props - Parameters object
 * @param props.bookmarks - Array of bookmarks with IDs and meta_data containing saved_collection_names
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @param props.uniqueCategoriesWithNameAndId - Map of category name to category ID
 * @param props.userId - User ID
 * @returns Promise that resolves when categories are added
 */
export async function addCategoriesToBookmarkByName(
	props: AddCategoriesToBookmarkByNameProps,
): Promise<{ error: PostgrestError | null }> {
	const { bookmarks, route, supabase, uniqueCategoriesWithNameAndId, userId } =
		props;

	// Build bulk insert array with all bookmark-category pairs
	const bookmarkCategoryPairs: Array<{
		bookmark_id: number;
		category_id: number;
		user_id: string;
	}> = [];

	for (const bookmark of bookmarks) {
		const bookmarkId = bookmark.id;
		const metaData = bookmark.meta_data as InstagramMetaData;
		const collectionNames = metaData?.saved_collection_names;

		if (
			!collectionNames ||
			!Array.isArray(collectionNames) ||
			collectionNames.length === 0
		) {
			continue;
		}

		// Get unique category names for this bookmark
		const uniqueCategoryNames = [
			...new Set(collectionNames.map((name) => name.trim()).filter(Boolean)),
		];

		// Map category names to IDs and build pairs
		for (const categoryName of uniqueCategoryNames) {
			const categoryId = uniqueCategoriesWithNameAndId.get(categoryName);
			if (categoryId) {
				bookmarkCategoryPairs.push({
					bookmark_id: bookmarkId,
					category_id: categoryId,
					user_id: userId,
				});
			}
		}
	}

	// Single bulk upsert to bookmark_categories table
	if (bookmarkCategoryPairs.length > 0) {
		console.log(
			`[${route}] Bulk upserting ${bookmarkCategoryPairs.length} bookmark-category pairs`,
		);

		const { error: bulkUpsertError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.upsert(bookmarkCategoryPairs, {
				onConflict: "bookmark_id,category_id",
				ignoreDuplicates: true,
			});

		if (bulkUpsertError) {
			return { error: bulkUpsertError };
		}

		console.log(
			`[${route}] Successfully bulk upserted ${bookmarkCategoryPairs.length} bookmark-category pairs`,
		);
	}

	return { error: null };
}
