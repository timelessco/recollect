import { type SupabaseClient } from "@supabase/supabase-js";
import { isEmpty } from "lodash";
import { z } from "zod";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { type Database } from "@/types/database-generated.types";
import {
	BOOKMARK_CATEGORIES_TABLE_NAME,
	CATEGORIES_TABLE_NAME,
	MAIN_TABLE_NAME,
} from "@/utils/constants";

const ROUTE = "instagram-sync-bookmarks";

const InstagramSyncBookmarksPayloadSchema = z.object({
	data: z.array(
		z.object({
			description: z.string(),
			ogImage: z.string().nullable(),
			title: z.string(),
			type: z.string(),
			url: z.string(),
			meta_data: z.object({
				instagram_username: z.string(),
				instagram_profile_pic: z.string().nullable().optional(),
				favIcon: z.string(),
				video_url: z.string().nullable().optional(),
				saved_collection_names: z.array(z.string()).optional(),
			}),
			inserted_at: z.string().datetime().optional(),
			sort_index: z.string(),
			category_name: z.string().optional(),
		}),
	),
});

const InstagramSyncBookmarksResponseSchema = z.object({
	success: z.boolean(),
	error: z.string().nullable(),
	data: z.array(z.any()).optional(),
});

export type InstagramSyncBookmarksPayload = z.infer<
	typeof InstagramSyncBookmarksPayloadSchema
>;

export type InstagramSyncBookmarksResponse = z.infer<
	typeof InstagramSyncBookmarksResponseSchema
>;

/**
 * Adds a bookmark to categories by category names.
 * Looks up category IDs by name (with icon="bookmark" and icon_color="#ffffff") and upserts them into bookmark_categories table.
 * @param params - Parameters object
 * @param params.supabase - Supabase client
 * @param params.userId - User ID
 * @param params.bookmarkId - Bookmark ID
 * @param params.bookmarkUrl - Bookmark URL (for logging)
 * @param params.categoryNames - Array of category names
 * @param params.route - Route name for logging
 * @returns Promise that resolves when categories are added
 */
export async function addCategoriesToBookmarkByName({
	supabase,
	userId,
	bookmarkId,
	bookmarkUrl,
	categoryNames,
	route,
}: {
	supabase: SupabaseClient<Database>;
	userId: string;
	bookmarkId: number;
	bookmarkUrl: string;
	categoryNames: string[];
	route: string;
}): Promise<void> {
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

export const POST = createSupabasePostApiHandler({
	route: ROUTE,
	inputSchema: InstagramSyncBookmarksPayloadSchema,
	outputSchema: InstagramSyncBookmarksResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			bookmarkCount: data.data.length,
		});

		// adding user_id in the data to be inserted
		const insertData = data.data.map((item) => ({
			...item,
			user_id: userId,
		}));

		// get the urls who are instagram posts present in table, we fetch only the urls there are there in the insertData for the query optimization
		const { data: duplicateCheckData, error: duplicateCheckError } =
			await supabase
				.from(MAIN_TABLE_NAME)
				.select("url")
				// get only the urls that are there in the payload
				.in(
					"url",
					insertData.map((item) => item.url),
				)
				.eq("user_id", userId)
				.eq("type", "instagram");

		if (duplicateCheckError) {
			console.warn(`[${route}] DB duplicateCheckError`, duplicateCheckError);

			return apiError({
				route,
				message: `DB duplicateCheckError: ${duplicateCheckError.message}`,
				error: duplicateCheckError,
				operation: "duplicate_check",
				userId,
			});
		}

		// filter out the duplicates from the payload data
		const duplicateFilteredData = insertData.filter(
			(item) =>
				!duplicateCheckData
					?.map((duplicateCheckItem) => duplicateCheckItem.url)
					?.includes(item.url),
		);

		if (isEmpty(duplicateFilteredData)) {
			console.warn(`[${route}] No data to insert`);

			return apiWarn({
				route,
				message: "No data to insert",
				status: 404,
				context: { bookmarkCount: insertData.length },
			});
		}

		// adding the data in DB
		const { data: insertDBData, error: insertDBError } = await supabase
			.from(MAIN_TABLE_NAME)
			.insert(duplicateFilteredData)
			.select("*");

		if (insertDBError) {
			console.warn(`[${route}] DB error`, insertDBError);

			return apiError({
				route,
				message: "DB error",
				error: insertDBError,
				operation: "insert_bookmarks",
				userId,
			});
		}

		console.log("insertDBData", insertDBData);

		if (isEmpty(insertDBData)) {
			console.warn(`[${route}] Empty data after insertion`);

			return apiError({
				route,
				message: "Empty data after insertion",
				error: new Error("No data returned from insert"),
				operation: "insert_bookmarks",
				userId,
			});
		}

		// Add bookmarks to collections if saved_collection_names is provided in meta_data
		const bookmarksWithCollections = insertDBData.filter((bookmark) => {
			const metaData = bookmark.meta_data as {
				saved_collection_names?: string[];
			} | null;
			const collectionNames = metaData?.saved_collection_names;
			return (
				collectionNames &&
				Array.isArray(collectionNames) &&
				collectionNames.length > 0
			);
		});

		if (bookmarksWithCollections.length > 0) {
			console.log(
				`[${route}] Adding ${bookmarksWithCollections.length} bookmarks to collections`,
			);

			// Process each bookmark with collections
			for (const bookmark of bookmarksWithCollections) {
				const bookmarkUrl = bookmark.url;
				if (!bookmarkUrl) {
					continue;
				}

				const metaData = bookmark.meta_data as {
					saved_collection_names?: string[];
				} | null;
				const collectionNames = metaData?.saved_collection_names;

				if (
					!collectionNames ||
					!Array.isArray(collectionNames) ||
					collectionNames.length === 0
				) {
					continue;
				}

				const bookmarkId = bookmark.id;

				try {
					await addCategoriesToBookmarkByName({
						supabase,
						userId,
						bookmarkId,
						bookmarkUrl,
						categoryNames: collectionNames,
						route,
					});
				} catch (error) {
					console.error(
						`[${route}] Failed to add bookmark ${bookmarkId} to collections:`,
						error,
					);
					// Continue processing other bookmarks even if one fails
				}
			}
		}

		try {
			// Type assertion needed because pgmq_public schema is not in the Database type
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const pgmqSupabase = (supabase as any).schema("pgmq_public");
			const { data: queueResults, error: queueResultsError } =
				await pgmqSupabase.rpc("send_batch", {
					queue_name: "ai-embeddings",
					messages: insertDBData,
					sleep_seconds: 0,
				});

			if (queueResultsError) {
				console.warn(`[${route}] Failed to queue item:`, queueResultsError);

				return apiError({
					route,
					message: "Failed to queue item",
					error: queueResultsError,
					operation: "queue_embeddings",
					userId,
				});
			}

			const queueResultsArray = Array.isArray(queueResults) ? queueResults : [];
			console.log(
				`[${route}] Successfully queued ${queueResultsArray.length} items`,
			);
		} catch (error) {
			console.error(`[${route}] Failed to queue item:`, error);

			return apiError({
				route,
				message: "Failed to queue item",
				error: error instanceof Error ? error : new Error(String(error)),
				operation: "queue_embeddings",
				userId,
			});
		}

		return {
			success: true,
			error: null,
			data: insertDBData,
		};
	},
});
