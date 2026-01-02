import { isEmpty } from "lodash";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import {
	addCategoriesToBookmarkByName,
	fetchUniqueCategoriesWithNameAndId,
} from "@/lib/api-helpers/instagram/add-categories-to-bookmark";
import {
	InstagramSyncBookmarksPayloadSchema,
	InstagramSyncBookmarksResponseSchema,
	type InstagramMetaData,
	type InstagramMetaDataWithCollections,
} from "@/lib/api-helpers/instagram/schemas";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

const ROUTE = "instagram-sync-bookmarks";
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
		const duplicateUrls = new Set(
			duplicateCheckData?.map((item) => item.url) || [],
		);
		const duplicateFilteredData = insertData.filter(
			(item) => !duplicateUrls.has(item.url),
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
		// Filter validates that collectionNames exists, is an array, and has length > 0
		// All bookmarks in bookmarksWithCollections are guaranteed to have valid collection names
		const bookmarksWithCollections = insertDBData.filter((bookmark) => {
			const metaData = bookmark.meta_data as InstagramMetaData;
			const collectionNames = metaData?.saved_collection_names;
			return (
				collectionNames &&
				Array.isArray(collectionNames) &&
				collectionNames.length > 0
			);
		});

		if (bookmarksWithCollections.length > 0) {
			const bookmarksWithMetaData = bookmarksWithCollections.map(
				(bookmark) => ({
					meta_data: bookmark.meta_data as InstagramMetaDataWithCollections,
				}),
			);

			const {
				uniqueCategoriesWithNameAndId,
				error: fetchUniqueCategoriesWithNameAndIdError,
			} = await fetchUniqueCategoriesWithNameAndId({
				bookmarks: bookmarksWithMetaData,
				route,
				supabase,
				userId,
			});

			if (fetchUniqueCategoriesWithNameAndIdError) {
				return apiError({
					route,
					message: "Failed to fetch unique categories with name and id",
					error: fetchUniqueCategoriesWithNameAndIdError,
					operation: "fetch_unique_categories_with_name_and_id",
					userId,
				});
			}

			const bookmarksWithMetaDataAndId = bookmarksWithCollections.map(
				(bookmark) => ({
					id: bookmark.id,
					meta_data: bookmark.meta_data as InstagramMetaData,
				}),
			);
			// Bulk add bookmarks to categories
			const { error: addCategoriesToBookmarkByNameError } =
				await addCategoriesToBookmarkByName({
					bookmarks: bookmarksWithMetaDataAndId,
					route,
					supabase,
					uniqueCategoriesWithNameAndId,
					userId,
				});

			if (addCategoriesToBookmarkByNameError) {
				return apiError({
					route,
					message: "Failed to add bookmarks to categories",
					error: addCategoriesToBookmarkByNameError,
					operation: "add_bookmarks_to_categories",
					userId,
				});
			}

			console.log(
				`[${route}] Successfully added ${bookmarksWithCollections.length} bookmarks to categories`,
			);
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
