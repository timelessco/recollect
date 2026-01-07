import { isEmpty } from "lodash";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import {
	InstagramSyncBookmarksPayloadSchema,
	InstagramSyncBookmarksResponseSchema,
} from "@/lib/api-helpers/instagram/schemas";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { MAIN_TABLE_NAME } from "@/utils/constants";

const ROUTE = "instagram-sync-bookmarks";
export const POST = createPostApiHandlerWithAuth({
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

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const pgmqSupabase = (supabase as any).schema("pgmq_public");

		// Queue both operations in parallel to reduce latency
		const [importsQueueResult, aiEmbeddingsQueueResult] = await Promise.all([
			pgmqSupabase.rpc("send_batch", {
				queue_name: "imports",
				messages: insertDBData,
				sleep_seconds: 0,
			}),
			pgmqSupabase.rpc("send_batch", {
				queue_name: "ai-embeddings",
				messages: insertDBData,
				sleep_seconds: 0,
			}),
		]);

		const { data: queueResults, error: queueResultsError } = importsQueueResult;
		const {
			data: aiEmbeddingsQueueResults,
			error: aiEmbeddingsQueueResultsError,
		} = aiEmbeddingsQueueResult;

		// Handle imports queue error
		if (queueResultsError) {
			console.warn(
				`[${route}] Failed to queue item to imports:`,
				queueResultsError,
			);

			return apiError({
				route,
				message: "Failed to queue item to imports",
				error: queueResultsError,
				operation: "queue_imports",
				userId,
			});
		}

		// Handle ai-embeddings queue error
		if (aiEmbeddingsQueueResultsError) {
			console.warn(
				`[${route}] Failed to queue item to ai-embeddings:`,
				aiEmbeddingsQueueResultsError,
			);

			return apiError({
				route,
				message: "Failed to queue item to ai-embeddings",
				error: aiEmbeddingsQueueResultsError,
				operation: "queue_embeddings",
				userId,
			});
		}

		const queueResultsArray = Array.isArray(queueResults) ? queueResults : [];
		const aiEmbeddingsQueueResultsArray = Array.isArray(
			aiEmbeddingsQueueResults,
		)
			? aiEmbeddingsQueueResults
			: [];

		console.log(
			`[${route}] Successfully queued ${queueResultsArray.length} items for adding categories`,
		);
		console.log(
			`[${route}] Successfully queued ${aiEmbeddingsQueueResultsArray.length} items for ai-embeddings`,
		);

		return {
			success: true,
			error: null,
			data: insertDBData,
		};
	},
});
