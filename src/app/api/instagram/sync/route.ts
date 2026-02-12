import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/types/database.types";
import { instagramType } from "@/utils/constants";

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
				ogImage: z.string().nullish(),
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
	inserted: z.number(),
	skipped: z.number(),
});

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: InstagramSyncInputSchema,
	outputSchema: InstagramSyncOutputSchema,
	handler: async ({ data, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] Inserting ${data.bookmarks.length} bookmarks`, {
			userId,
		});

		// In-memory deduplicate: remove exact URL duplicates within the batch
		const seen = new Set<string>();
		const uniqueBookmarks = data.bookmarks.filter((bookmark) => {
			if (seen.has(bookmark.url)) {
				return false;
			}

			seen.add(bookmark.url);
			return true;
		});

		const inMemorySkipped = data.bookmarks.length - uniqueBookmarks.length;

		// Call transactional RPC for synchronous dedup + insert
		const serviceClient = await createServerServiceClient();
		const { data: result, error: rpcError } = await serviceClient.rpc(
			"enqueue_instagram_bookmarks",
			{
				p_user_id: userId,
				p_bookmarks: uniqueBookmarks as unknown as Json[],
			},
		);

		if (rpcError) {
			console.error(`[${route}] RPC error:`, rpcError);
			return apiError({
				route,
				message: "Failed to insert bookmarks",
				error: rpcError,
				operation: "enqueue_instagram_bookmarks",
				userId,
			});
		}

		const parsed = InstagramSyncOutputSchema.safeParse(result);
		if (!parsed.success) {
			console.error(`[${route}] Unexpected RPC result:`, result);
			return apiError({
				route,
				message: "Failed to insert bookmarks",
				error: new Error("Unexpected RPC result shape"),
				operation: "enqueue_instagram_bookmarks",
				userId,
				extra: { result },
			});
		}

		console.log(`[${route}] Result:`, {
			inserted: parsed.data.inserted,
			skipped: parsed.data.skipped + inMemorySkipped,
		});

		return {
			inserted: parsed.data.inserted,
			skipped: parsed.data.skipped + inMemorySkipped,
		};
	},
});
