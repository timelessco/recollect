import {
	type PostgrestError,
	type SupabaseClient,
} from "@supabase/supabase-js";

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

/**
 * Fetches categories by name and adds a single bookmark to those categories.
 * This is a convenience function that combines fetching categories and adding the bookmark.
 * @param props - Parameters object
 * @param props.bookmark - Bookmark with id, user_id, and meta_data containing saved_collection_names
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @returns Promise that resolves with error (null on success)
 */
export async function addCategoriesToBookmark(
	props: AddBookmarkToCategoriesProps,
): Promise<{ error: PostgrestError | null }> {
	const { bookmark, route, supabase } = props;
	const { id: bookmarkId, user_id: userId, meta_data } = bookmark;

	// Validate that bookmark has collection names
	const metaData = meta_data as InstagramMetaData;
	const collectionNames = metaData?.saved_collection_names;

	if (
		!collectionNames ||
		!Array.isArray(collectionNames) ||
		collectionNames.length === 0
	) {
		console.log(
			`[${route}] Bookmark ${bookmarkId} has no collection names, skipping`,
		);
		return { error: null };
	}

	// Get unique category names
	const uniqueCategoryNames = [
		...new Set(collectionNames.map((name) => name.trim()).filter(Boolean)),
	];

	if (uniqueCategoryNames.length === 0) {
		console.log(
			`[${route}] Bookmark ${bookmarkId} has no valid category names, skipping`,
		);
		return { error: null };
	}

	// Fetch categories by name
	const { data: categories, error: categoriesError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select("id, category_name")
		.eq("user_id", userId)
		.eq("icon", INSTAGRAM_COLLECTION_DEFAULTS.ICON)
		.eq("icon_color", INSTAGRAM_COLLECTION_DEFAULTS.ICON_COLOR)
		.in("category_name", uniqueCategoryNames);

	if (categoriesError) {
		console.error(
			`[${route}] Failed to fetch categories for bookmark ${bookmarkId}:`,
			categoriesError,
		);
		return { error: categoriesError };
	}

	if (!categories || categories.length === 0) {
		console.log(
			`[${route}] No categories found for bookmark ${bookmarkId} collection names:`,
			uniqueCategoryNames,
		);
		return { error: null };
	}

	// Build bookmark-category pairs
	const bookmarkCategoryPairs: Array<{
		bookmark_id: number;
		category_id: number;
		user_id: string;
	}> = [];

	for (const category of categories) {
		if (category.category_name && category.id) {
			bookmarkCategoryPairs.push({
				bookmark_id: bookmarkId,
				category_id: category.id,
				user_id: userId,
			});
		}
	}

	if (bookmarkCategoryPairs.length === 0) {
		console.log(
			`[${route}] No valid category pairs for bookmark ${bookmarkId}`,
		);
		return { error: null };
	}

	// Upsert bookmark-category pairs
	const { error: upsertError } = await supabase
		.from(BOOKMARK_CATEGORIES_TABLE_NAME)
		.upsert(bookmarkCategoryPairs, {
			onConflict: "bookmark_id,category_id",
			ignoreDuplicates: true,
		});

	if (upsertError) {
		console.error(
			`[${route}] Failed to add categories for bookmark ${bookmarkId}:`,
			upsertError,
		);
		return { error: upsertError };
	}

	console.log(
		`[${route}] Successfully added bookmark ${bookmarkId} to ${bookmarkCategoryPairs.length} categories`,
	);

	return { error: null };
}
