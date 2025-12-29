import { type SupabaseClient } from "@supabase/supabase-js";

import { type Database } from "@/types/database-generated.types";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
} from "@/utils/constants";

export interface AddCategoriesToBookmarkByNameProps {
	bookmarkId: number;
	bookmarkUrl: string;
	categoryNames: string[];
	route: string;
	supabase: SupabaseClient<Database>;
	userId: string;
}

/**
 * Adds a bookmark to categories by category names.
 * Looks up category IDs by name (with icon="bookmark" and icon_color="#ffffff") and upserts them into bookmark_categories table.
 * @param props - Parameters object
 * @param props.supabase - Supabase client
 * @param props.userId - User ID
 * @param props.bookmarkId - Bookmark ID
 * @param props.bookmarkUrl - Bookmark URL (for logging)
 * @param props.categoryNames - Array of category names
 * @param props.route - Route name for logging
 * @returns Promise that resolves when categories are added
 */
export async function addCategoriesToBookmarkByName(
	props: AddCategoriesToBookmarkByNameProps,
): Promise<void> {
	const { bookmarkId, bookmarkUrl, categoryNames, route, supabase, userId } =
		props;

	if (!categoryNames || categoryNames.length === 0) {
		return;
	}

	// Remove duplicates and empty strings
	const uniqueCategoryNames = [
		...new Set(categoryNames.map((name) => name.trim()).filter(Boolean)),
	];

	if (uniqueCategoryNames.length === 0) {
		return;
	}

	console.log(`[${route}] Looking up categories by name:`, {
		bookmarkId,
		bookmarkUrl,
		categoryNames: uniqueCategoryNames,
	});

	// Look up category IDs by name for this user with icon="bookmark" and icon_color="#ffffff"
	const { data: categories, error: categoriesError } = await supabase
		.from(CATEGORIES_TABLE_NAME)
		.select("id, category_name")
		.eq("user_id", userId)
		.eq("icon", "bookmark")
		.eq("icon_color", "#ffffff")
		.in("category_name", uniqueCategoryNames);

	if (categoriesError) {
		throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
	}

	if (!categories || categories.length === 0) {
		console.warn(`[${route}] No categories found for names:`, {
			bookmarkId,
			bookmarkUrl,
			categoryNames: uniqueCategoryNames,
		});
		return;
	}

	const categoryIds = categories.map((cat) => cat.id);

	console.log(`[${route}] Found ${categoryIds.length} categories:`, {
		bookmarkId,
		bookmarkUrl,
		categoryIds,
		categoryNames: categories.map((cat) => cat.category_name),
	});

	// Upsert each category into bookmark_categories table
	// This preserves existing categories (upsert only adds if not exists)
	const upsertPromises = categoryIds.map(async (categoryId) => {
		const { error: upsertError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.upsert(
				{
					bookmark_id: bookmarkId,
					category_id: categoryId,
					user_id: userId,
				},
				{
					onConflict: "bookmark_id,category_id",
					ignoreDuplicates: true,
				},
			);

		if (upsertError) {
			throw new Error(
				`Failed to upsert category ${categoryId} for bookmark ${bookmarkId}: ${upsertError.message}`,
			);
		}
	});

	// Execute all upserts in parallel
	await Promise.all(upsertPromises);

	console.log(`[${route}] Successfully added bookmark to categories:`, {
		bookmarkId,
		bookmarkUrl,
		categoryIds,
	});
}
