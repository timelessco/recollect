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

	// get existing categories
	const { data: existingCategories, error: existingCategoriesError } =
		await supabase
			.from(CATEGORIES_TABLE_NAME)
			.select("*")
			.in("category_name", categories)
			.in("icon", ["droplets-02"])
			.in("icon_color", ["#ffffff"])
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

	// this is the list of categories that need to be inserted
	const newCategories = categories.filter(
		(category) => !existingCategoryNames.has(category),
	);

	const categoriesToInsert = newCategories.map((category_name) => ({
		category_name,
		user_id: userId,
		category_slug: `${slugify(category_name, { lower: true })}-rain_drop-${uniqid.time()}`,
		icon: "droplets-02",
		icon_color: "#ffffff",
	}));

	const {
		data: insertedcategories,
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

	const categoriesData = [
		...(insertedcategories || []),
		...(existingCategories || []),
	];

	return {
		categoriesData,
		insertedCategories: insertedcategories || [],
	};
}

type BookmarkWithCategoryId = {
	url: string;
	category_id: number;
	category_name: string | null;
	[key: string]: unknown;
};

type DeduplicateBookmarksResult = {
	bookmarksToSanitize: BookmarkWithCategoryId[];
	duplicatesRemoved: number;
	existingRemoved: number;
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

	// Check existing bookmarks in database
	const urlsToCheck = bookmarksWithCategoryId.map((b) => b.url);
	const categoryIdsToCheck = [
		...new Set(bookmarksWithCategoryId.map((b) => b.category_id)),
	];

	const { data: existingBookmarks, error: existingError } = await supabase
		.from(MAIN_TABLE_NAME)
		.select("url, category_id")
		.in("url", urlsToCheck)
		.in("category_id", categoryIdsToCheck)
		.eq("user_id", userId);

	if (existingError) {
		console.error(`[${route}] Error checking existing bookmarks:`, {
			error: existingError,
			userId,
		});
		Sentry.captureException(existingError, {
			tags: {
				operation: "check_existing_bookmarks",
				userId,
			},
			extra: {
				urlsToCheckCount: urlsToCheck.length,
				categoryIdsToCheckCount: categoryIdsToCheck.length,
			},
		});
		// Continue processing - this is non-blocking, we'll just insert duplicates
	}

	//  Filter out existing bookmarks
	const existingMap = new Map<string, boolean>();
	if (existingBookmarks && existingBookmarks.length > 0) {
		for (const existingBookmark of existingBookmarks) {
			const key = `${existingBookmark.url}_${existingBookmark.category_id}`;
			existingMap.set(key, true);
		}

		console.log(`[${route}] Found existing bookmarks in database:`, {
			existingCount: existingBookmarks.length,
			userId,
		});
	}

	const bookmarksToSanitize = bookmarksWithCategoryId.filter((bookmark) => {
		const key = `${bookmark.url}_${bookmark.category_id}`;

		// Only keep if not existing
		return !existingMap.has(key);
	});

	const existingRemoved =
		bookmarksWithCategoryId.length - bookmarksToSanitize.length;
	if (existingRemoved > 0) {
		console.log(`[${route}] Removed existing bookmarks:`, {
			existingRemoved,
			userId,
		});
	}

	return {
		bookmarksToSanitize,
		duplicatesRemoved,
		existingRemoved,
	};
}

type InsertBookmarksResult = {
	insertedBookmarks: SingleListData[];
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
 * @returns Inserted bookmarks
 * @throws Error if bookmark insertion fails
 */
export async function insertBookmarksWithRelations(
	props: InsertBookmarksWithRelationsProps,
): Promise<InsertBookmarksResult> {
	const { bookmarksToSanitize, categoriesData, route, supabase, userId } =
		props;
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
			// Non-blocking: bookmarks are already inserted, junction entries are supplementary
		}
	}

	return {
		insertedBookmarks: data || [],
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
