import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/types/database.types";
import { INSTAGRAM_IMPORTS_QUEUE, instagramType } from "@/utils/constants";

const ROUTE = "instagram-sync";

// Input validation - minimal at API level, full validation in worker
const InstagramSyncInputSchema = z.object({
	bookmarks: z
		.array(
			z.object({
				url: z.url().refine((url) => {
					try {
						const parsed = new URL(url);
						return (
							parsed.hostname === "instagram.com" ||
							parsed.hostname === "www.instagram.com"
						);
					} catch {
						return false;
					}
				}, "Must be a valid Instagram URL"),
				title: z.string().default(""),
				description: z.string().default(""),
				ogImage: z.string().nullable(),
				type: z.literal(instagramType).default(instagramType),
				meta_data: z.record(z.string(), z.unknown()).default({}),
				// Instagram's original save timestamp for ordering
				saved_at: z.iso.datetime(),
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
	handler: async ({ data, user, route }) => {
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
			saved_at: bookmark.saved_at ?? null,
		}));

		// Queue all bookmarks via pgmq.send_batch using service role client
		// (authenticated users don't have direct queue access for security)
		const serviceClient = await createServerServiceClient();
		const pgmqSupabase = serviceClient.schema("pgmq_public");
		const { data: queueResults, error: queueError } = await pgmqSupabase.rpc(
			"send_batch",
			{
				queue_name: INSTAGRAM_IMPORTS_QUEUE,
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
