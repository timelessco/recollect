import { isEmpty } from "lodash";
import { z } from "zod";

import { createSupabasePostApiHandler } from "@/lib/api-helpers/create-handler";
import { addCategoriesToBookmarkByName } from "@/lib/api-helpers/instagram/add-categories-to-bookmark";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

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
	data: z
		.array(
			z.object({
				category_id: z.number(),
				description: z.string().nullable(),
				id: z.number(),
				inserted_at: z.string(),
				meta_data: z.unknown().nullable(),
				ogImage: z.string().nullable(),
				screenshot: z.string().nullable(),
				sort_index: z.string().nullable(),
				title: z.string().nullable(),
				trash: z.boolean(),
				type: z.string().nullable(),
				url: z.string().nullable(),
				user_id: z.string(),
			}),
		)
		.optional(),
});

export type InstagramSyncBookmarksPayload = z.infer<
	typeof InstagramSyncBookmarksPayloadSchema
>;

export type InstagramSyncBookmarksResponse = z.infer<
	typeof InstagramSyncBookmarksResponseSchema
>;

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
						bookmarkId,
						bookmarkUrl,
						categoryNames: collectionNames,
						route,
						supabase,
						userId,
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
