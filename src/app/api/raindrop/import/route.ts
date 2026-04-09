import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { toJson } from "@/utils/type-utils";

import { RaindropImportInputSchema, RaindropImportOutputSchema } from "./schema";

const ROUTE = "raindrop-import";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, user }) => {
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
    const serviceClient = createServerServiceClient();
    const { data: result, error: rpcError } = await serviceClient.rpc(
      "enqueue_raindrop_bookmarks",
      {
        p_bookmarks: toJson(uniqueBookmarks),
        p_user_id: userId,
      },
    );

    if (rpcError) {
      console.error(`[${route}] RPC error:`, rpcError);
      return apiError({
        error: rpcError,
        message: "Failed to queue bookmarks for import",
        operation: "enqueue_raindrop_bookmarks",
        route,
        userId,
      });
    }

    const parsed =
      typeof result === "object" && result !== null && !Array.isArray(result) ? result : {};
    const inserted = typeof parsed.inserted === "number" ? parsed.inserted : 0;
    const dbSkipped = typeof parsed.skipped === "number" ? parsed.skipped : 0;

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
  inputSchema: RaindropImportInputSchema,
  outputSchema: RaindropImportOutputSchema,
  route: ROUTE,
});
