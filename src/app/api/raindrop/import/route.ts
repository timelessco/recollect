import {
	RaindropImportInputSchema,
	RaindropImportOutputSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { type Json } from "@/types/database.types";

const ROUTE = "raindrop-import";

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: RaindropImportInputSchema,
	outputSchema: RaindropImportOutputSchema,
	handler: async ({ data, user, route }) => {
		const userId = user.id;

		console.log(`[${route}] Importing ${data.bookmarks.length} bookmarks`, {
			userId,
		});

		// In-memory deduplicate: remove exact URL duplicates within the batch
		const seen = new Set<string>();
		const uniqueBookmarks = data.bookmarks.filter((bookmark) => {
			const key = bookmark.url;
			if (seen.has(key)) {
				return false;
			}

			seen.add(key);
			return true;
		});

		const inMemorySkipped = data.bookmarks.length - uniqueBookmarks.length;

		// Call enqueue_raindrop_bookmarks RPC via service role client
		// (authenticated users don't have direct queue access for security)
		const serviceClient = await createServerServiceClient();
		const { data: result, error: rpcError } = await serviceClient.rpc(
			"enqueue_raindrop_bookmarks",
			{
				p_user_id: userId,
				p_bookmarks: uniqueBookmarks as unknown as Json,
			},
		);

		if (rpcError) {
			console.error(`[${route}] RPC error:`, rpcError);
			return apiError({
				route,
				message: "Failed to queue bookmarks for import",
				error: rpcError,
				operation: "enqueue_raindrop_bookmarks",
				userId,
			});
		}

		const inserted = (result as { inserted: number })?.inserted ?? 0;
		const dbSkipped = (result as { skipped: number })?.skipped ?? 0;

		console.log(`[${route}] Queued successfully:`, {
			queued: inserted,
			skipped: dbSkipped + inMemorySkipped,
			userId,
		});

		return {
			queued: inserted,
			skipped: dbSkipped + inMemorySkipped,
		};
	},
});
