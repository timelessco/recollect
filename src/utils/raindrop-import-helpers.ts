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
