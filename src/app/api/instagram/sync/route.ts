import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { type Json } from "@/types/database.types";

const ROUTE = "instagram-sync";

// Input validation - minimal at API level, full validation in worker
const InstagramSyncInputSchema = z.object({
	bookmarks: z
		.array(
			z.object({
				url: z.string(),
				title: z.string().optional().default(""),
				description: z.string().optional().default(""),
				ogImage: z.string().nullable().optional(),
				type: z.string().default("instagram"),
				meta_data: z.record(z.string(), z.unknown()).optional().default({}),
				// sort_index is ignored per spec - included only for compatibility
				sort_index: z.string().optional(),
			}),
		)
		.min(1, "At least one bookmark required")
		.max(500, "Maximum 500 bookmarks per request"),
});

// Output schema - handler wrapper adds { data: ..., error: null }
const InstagramSyncOutputSchema = z.object({
	queued: z.number(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: InstagramSyncInputSchema,
	outputSchema: InstagramSyncOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] Queueing ${data.bookmarks.length} bookmarks`, {
			userId,
		});

		// Prepare queue messages with user_id included
		const messages = data.bookmarks.map((bookmark) => ({
			url: bookmark.url,
			type: bookmark.type,
			title: bookmark.title,
			description: bookmark.description,
			ogImage: bookmark.ogImage ?? null,
			meta_data: bookmark.meta_data,
			user_id: userId,
		}));

		// Queue all bookmarks via pgmq.send_batch
		const pgmqSupabase = supabase.schema("pgmq_public");
		const { data: queueResults, error: queueError } = await pgmqSupabase.rpc(
			"send_batch",
			{
				queue_name: "q_instagram_imports",
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

		// Handler wrapper adds { data: ..., error: null }
		return { queued: queuedCount };
	},
});
