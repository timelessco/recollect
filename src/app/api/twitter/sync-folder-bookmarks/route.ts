import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/types/database.types";
import { TWITTER_IMPORTS_QUEUE } from "@/utils/constants";

const ROUTE = "twitter-sync-folder-bookmarks";

const SyncFolderBookmarksInputSchema = z.object({
	mappings: z
		.array(
			z.object({
				url: z.string().url(),
				category_name: z.string().min(1, "Category name is required"),
			}),
		)
		.min(1, "At least one mapping required")
		.max(500, "Maximum 500 mappings per request"),
});

const SyncFolderBookmarksOutputSchema = z.object({
	queued: z.number(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: SyncFolderBookmarksInputSchema,
	outputSchema: SyncFolderBookmarksOutputSchema,
	handler: async ({ data, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] Queueing ${data.mappings.length} link messages`, {
			userId,
		});

		// Prepare queue messages with type discriminator
		const messages = data.mappings.map((mapping) => ({
			type: "link_bookmark_category" as const,
			url: mapping.url,
			user_id: userId,
			category_name: mapping.category_name,
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
				message: "Failed to queue category links",
				error: queueError,
				operation: "queue_category_links",
				userId,
			});
		}

		const queuedCount = Array.isArray(queueResults) ? queueResults.length : 0;
		console.log(`[${route}] Queued successfully:`, { queued: queuedCount });

		return { queued: queuedCount };
	},
});
