import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/types/database.types";
import { tweetType, TWITTER_IMPORTS_QUEUE } from "@/utils/constants";

const ROUTE = "twitter-sync";

const TwitterSyncInputSchema = z.object({
	bookmarks: z
		.array(
			z.object({
				url: z.string().url(),
				title: z.string().default(""),
				description: z.string().default(""),
				ogImage: z.string().nullish(),
				type: z.literal(tweetType).default(tweetType),
				meta_data: z.record(z.string(), z.unknown()).default({}),
				sort_index: z.string().default(""),
				inserted_at: z.string().datetime().optional(),
			}),
		)
		.min(1, "At least one bookmark required")
		.max(500, "Maximum 500 bookmarks per request"),
});

const TwitterSyncOutputSchema = z.object({
	queued: z.number(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: TwitterSyncInputSchema,
	outputSchema: TwitterSyncOutputSchema,
	handler: async ({ data, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] Queueing ${data.bookmarks.length} bookmarks`, {
			userId,
		});

		// Prepare queue messages with type discriminator
		const messages = data.bookmarks.map((bookmark) => ({
			type: "create_bookmark" as const,
			url: bookmark.url,
			title: bookmark.title,
			description: bookmark.description,
			ogImage: bookmark.ogImage ?? null,
			meta_data: bookmark.meta_data,
			sort_index: bookmark.sort_index,
			user_id: userId,
			inserted_at: bookmark.inserted_at ?? null,
		}));

		// Queue via pgmq.send_batch using service role client
		const serviceClient = await createServerServiceClient();
		const pgmqSupabase = serviceClient.schema("pgmq_public");
		const { data: queueResults, error: queueError } = await pgmqSupabase.rpc(
			"send_batch",
			{
				queue_name: TWITTER_IMPORTS_QUEUE,
				messages: messages as unknown as Json[],
				sleep_seconds: 0,
			},
		);

		if (queueError) {
			console.error(`[${route}] Queue error:`, queueError);
			return apiError({
				route,
				message: "Failed to queue bookmarks",
				error: queueError,
				operation: "queue_bookmarks",
				userId,
			});
		}

		const queuedCount = Array.isArray(queueResults) ? queueResults.length : 0;
		console.log(`[${route}] Queued successfully:`, { queued: queuedCount });

		return { queued: queuedCount };
	},
});
