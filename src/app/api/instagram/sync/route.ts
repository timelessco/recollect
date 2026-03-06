import { InstagramSyncInputSchema, InstagramSyncOutputSchema } from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/types/database.types";

const ROUTE = "instagram-sync";

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
