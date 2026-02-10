import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/types/database.types";
import { tweetType } from "@/utils/constants";

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
	inserted: z.number(),
	skipped: z.number(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: TwitterSyncInputSchema,
	outputSchema: TwitterSyncOutputSchema,
	handler: async ({ data, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] Inserting ${data.bookmarks.length} bookmarks`, {
			userId,
		});

		// Call transactional RPC for synchronous dedup + insert
		const serviceClient = await createServerServiceClient();
		const { data: result, error: rpcError } = await serviceClient.rpc(
			"enqueue_twitter_bookmarks",
			{
				p_user_id: userId,
				p_bookmarks: data.bookmarks as Json[],
			},
		);

		if (rpcError) {
			console.error(`[${route}] RPC error:`, rpcError);
			return apiError({
				route,
				message: "Failed to insert bookmarks",
				error: rpcError,
				operation: "enqueue_twitter_bookmarks",
				userId,
			});
		}

		const parsed = TwitterSyncOutputSchema.safeParse(result);
		if (!parsed.success) {
			console.error(`[${route}] Unexpected RPC result:`, result);
			return apiError({
				route,
				message: "Failed to insert bookmarks",
				error: new Error("Unexpected RPC result shape"),
				operation: "enqueue_twitter_bookmarks",
				userId,
				extra: { result },
			});
		}

		console.log(`[${route}] Result:`, parsed.data);

		return parsed.data;
	},
});
