import * as Sentry from "@sentry/nextjs";
import {
	type PostgrestResponse,
	type SupabaseClient,
} from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import slugify from "slugify";
import uniqid from "uniqid";

import { sanitizeBookmarks } from "../async/supabaseCrudHelpers";
import { type CategoriesData, type SingleListData } from "../types/apiTypes";

import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
	PROFILES,
} from "./constants";
import { type BookmarkWithCategoryId } from "./raindrop-bookmark-helpers";

type ProcessCategoriesResult = {
	categoriesData: CategoriesData[];
	insertedCategories: CategoriesData[];
};

export interface ProcessRaindropCategoriesProps {
	bookmarks: Array<{ category_name: string | null }>;
	route: string;
	supabase: SupabaseClient;
	userId: string;
}

/**
 * Process Raindrop categories: extract unique names, fetch existing, insert new ones.
 * @param props - Function parameters
 * @param props.bookmarks - Array of bookmarks with category_name
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @param props.userId - User ID
 * @returns Combined categories data and inserted categories
 * @throws Error if category operations fail
 */
export async function processRaindropCategories(
	props: ProcessRaindropCategoriesProps,
): Promise<ProcessCategoriesResult> {
	const { bookmarks, route, supabase, userId } = props;
	const allCategories = bookmarks
		.filter(
			(bookmark) =>
				// if the bookmark is not is in a category then it is unsorted
				bookmark.category_name && bookmark.category_name !== "Unsorted",
		)
		// getting the category names
		.map((bookmark) => bookmark.category_name as string);

	// getting unique categories names
	const categories = Array.from(new Set(allCategories));

	// Early return if no categories to process (all bookmarks are uncategorized)
	if (categories.length === 0) {
		return {
			categoriesData: [],
			insertedCategories: [],
		};
	}

	// get existing categories
	// Note: Check only by category_name, not icon/icon_color, since the unique
	// constraint is on (user_id, category_name). This prevents duplicate key errors
	// when a category with the same name but different icon already exists.
	const { data: existingCategories, error: existingCategoriesError } =
		await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("*")
			.in("category_name", categories)
			.eq("user_id", userId);

	if (existingCategoriesError) {
		console.error(`[${route}] Error fetching existing categories:`, {
			error: existingCategoriesError,
			userId,
		});
		Sentry.captureException(existingCategoriesError, {
			tags: {
				operation: "fetch_existing_categories",
				userId,
			},
			extra: {
				categoriesCount: categories.length,
			},
		});
		throw new Error("Failed to fetch existing categories");
	}

	const existingCategoryNames = new Set(
		existingCategories?.map((category) => category.category_name),
	);

	// Filter out categories that already exist (regardless of icon/color)
	// Bookmarks will be associated with the user's existing categories
	const newCategories = categories.filter(
		(category) => !existingCategoryNames.has(category),
	);

	let insertedcategories: CategoriesData[] | null = null;

	// Only insert new categories if there are any to insert
	if (newCategories.length > 0) {
		const categoriesToInsert = newCategories.map((category_name) => ({
			category_name,
			user_id: userId,
			category_slug: `${slugify(category_name, { lower: true })}-rain_drop-${uniqid.time()}`,
			icon: "droplets-02",
			icon_color: "#ffffff",
		}));

		const {
			data: insertedCategoriesData,
			error: categoriesError,
		}: PostgrestResponse<CategoriesData> = await supabase
			.from(CATEGORIES_TABLE_NAME)
			.insert(categoriesToInsert)
			.select("*");

		if (categoriesError) {
			console.error(`[${route}] Error inserting categories:`, {
				error: categoriesError,
				userId,
			});
			Sentry.captureException(categoriesError, {
				tags: {
					operation: "insert_categories",
					userId,
				},
				extra: {
					newCategoriesCount: newCategories.length,
				},
			});
			throw new Error("Failed to insert categories");
		}

		insertedcategories = insertedCategoriesData;
	}

	const categoriesData = [
		...(insertedcategories || []),
		...(existingCategories || []),
	];

	return {
		categoriesData,
		insertedCategories: insertedcategories || [],
	};
}

type InsertBookmarksResult = {
	insertedBookmarks: SingleListData[];
	junctionError?: {
		error: unknown;
		relationsCount: number;
	};
};

export interface InsertBookmarksWithRelationsProps {
	bookmarksToSanitize: BookmarkWithCategoryId[];
	categoriesData: CategoriesData[];
	route: string;
	supabase: SupabaseClient;
	userId: string;
}

/**
 * Insert bookmarks and create bookmark-category relations.
 * @param props - Function parameters
 * @param props.bookmarksToSanitize - Bookmarks ready for sanitization
 * @param props.categoriesData - Categories data for sanitization
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @param props.userId - User ID
 * @returns Inserted bookmarks and optional junction error (if junction table insertion failed)
 * @throws Error if bookmark insertion fails
 */
export async function insertBookmarksWithRelations(
	props: InsertBookmarksWithRelationsProps,
): Promise<InsertBookmarksResult> {
	const { bookmarksToSanitize, categoriesData, route, supabase, userId } =
		props;

	// Early return if no bookmarks to sanitize
	if (bookmarksToSanitize.length === 0) {
		console.log(`[${route}] No bookmarks to sanitize, skipping insert:`, {
			bookmarksToSanitize: 0,
			userId,
		});
		return {
			insertedBookmarks: [],
		};
	}

	console.log(`[${route}] Sanitizing bookmarks before insert:`, {
		bookmarksToSanitize: bookmarksToSanitize.length,
		userId,
	});

	//  Sanitize just before inserting
	const sanitizedBookmarks = await sanitizeBookmarks(
		bookmarksToSanitize,
		userId,
		categoriesData || [],
	);

	// Early return if sanitization resulted in no bookmarks
	if (sanitizedBookmarks.length === 0) {
		console.log(
			`[${route}] No bookmarks after sanitization, skipping insert:`,
			{
				sanitizedBookmarks: 0,
				userId,
			},
		);
		return {
			insertedBookmarks: [],
		};
	}

	//  Insert only unique bookmarks
	const { data, error } = await supabase
		.from(MAIN_TABLE_NAME)
		.insert(sanitizedBookmarks)
		.select("*");

	if (error) {
		console.error(`[${route}] Error inserting bookmarks:`, {
			error,
			userId,
		});
		Sentry.captureException(error, {
			tags: {
				operation: "insert_bookmarks",
				userId,
			},
			extra: {
				bookmarksToInsertCount: sanitizedBookmarks.length,
			},
		});
		throw new Error("Failed to insert bookmarks");
	}

	// Create junction table entries for many-to-many bookmark-category relationship
	const bookmarkCategoryRelations = (data || [])
		.filter((bookmark) => bookmark.category_id && bookmark.category_id > 0)
		.map((bookmark) => ({
			bookmark_id: bookmark.id,
			category_id: bookmark.category_id,
			user_id: userId,
		}));

	let junctionErrorResult: InsertBookmarksResult["junctionError"] | undefined;

	if (bookmarkCategoryRelations.length > 0) {
		const { error: junctionError } = await supabase
			.from(BOOKMARK_CATEGORIES_TABLE_NAME)
			.insert(bookmarkCategoryRelations);

		if (junctionError) {
			console.error(`[${route}] Error inserting bookmark-category relations:`, {
				error: junctionError,
				userId,
			});
			Sentry.captureException(junctionError, {
				tags: {
					operation: "insert_bookmark_category_relations",
					userId,
				},
				extra: {
					relationsCount: bookmarkCategoryRelations.length,
				},
			});
			// Propagate error to caller: bookmarks are already inserted, but junction entries failed
			junctionErrorResult = {
				error: junctionError,
				relationsCount: bookmarkCategoryRelations.length,
			};
		}
	}

	return {
		insertedBookmarks: data || [],
		...(junctionErrorResult && { junctionError: junctionErrorResult }),
	};
}

export interface UpdateProfileCategoryOrderProps {
	insertedCategories: CategoriesData[];
	route: string;
	supabase: SupabaseClient;
	userId: string;
}

/**
 * Update profile category_order with new category IDs.
 * @param props - Function parameters
 * @param props.insertedCategories - Newly inserted categories
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @param props.userId - User ID
 * @throws Error if profile update fails
 */
export async function updateProfileCategoryOrder(
	props: UpdateProfileCategoryOrderProps,
): Promise<void> {
	const { insertedCategories, route, supabase, userId } = props;
	if (isEmpty(insertedCategories)) {
		return;
	}

	const { data: profileData, error: profileError } = await supabase
		.from(PROFILES)
		.select("category_order")
		.eq("id", userId)
		.single();

	if (profileError) {
		console.error(`[${route}] Error fetching profile data:`, {
			error: profileError,
			userId,
		});
		Sentry.captureException(profileError, {
			tags: {
				operation: "fetch_profile_category_order",
				userId,
			},
		});
		throw new Error("Failed to fetch profile data");
	}

	const existingOrder = profileData?.category_order ?? [];

	const newIds = insertedCategories.map((item) => item.id);

	const updatedOrder = [...existingOrder, ...newIds];

	const { error: orderError } = await supabase
		.from(PROFILES)
		.update({
			category_order: updatedOrder,
		})
		.eq("id", userId)
		.select("id, category_order")
		.single();

	if (orderError) {
		console.error(`[${route}] Error updating profile category order:`, {
			error: orderError,
			userId,
		});
		Sentry.captureException(orderError, {
			tags: {
				operation: "update_profile_category_order",
				userId,
			},
			extra: {
				newCategoryIdsCount: newIds.length,
			},
		});
		throw new Error("Failed to update profile data");
	}
}

export interface AddBookmarksToQueueProps {
	insertedBookmarks: SingleListData[];
	route: string;
	supabase: SupabaseClient;
	userId: string;
}

/**
 * Add bookmarks to AI embeddings queue for processing.
 * @param props - Function parameters
 * @param props.insertedBookmarks - Inserted bookmarks to add to queue
 * @param props.route - Route name for logging
 * @param props.supabase - Supabase client
 * @param props.userId - User ID for logging
 * @throws Error if queue addition fails
 */
export async function addBookmarksToQueue(
	props: AddBookmarksToQueueProps,
): Promise<void> {
	const { insertedBookmarks, route, supabase, userId } = props;

	// Early return if no bookmarks to add to queue
	if (insertedBookmarks.length === 0) {
		return;
	}

	const { error: queueResultsError } = await supabase
		.schema("pgmq_public")
		.rpc("send_batch", {
			queue_name: "ai-embeddings",
			messages: insertedBookmarks,
			sleep_seconds: 0,
		});

	if (queueResultsError) {
		console.error(`[${route}] Error adding messages to queue:`, {
			error: queueResultsError,
			userId,
		});
		Sentry.captureException(queueResultsError, {
			tags: {
				operation: "add_to_ai_embeddings_queue",
				userId,
			},
			extra: {
				messagesCount: insertedBookmarks.length,
				queueName: "ai-embeddings",
			},
		});
		throw new Error("Failed to add messages to processing queue");
	}
}
