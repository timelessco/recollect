import { z } from "zod";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { toJson } from "@/utils/type-utils";

import { ChromeBookmarkImportInputSchema, ChromeBookmarkImportOutputSchema } from "./schema";

const ROUTE = "v2-chrome-bookmark-import";

const RpcResultSchema = z.object({
  inserted: z.int(),
  skipped: z.int(),
});

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
      }
      setPayload(ctx, { bookmark_count: data.bookmarks.length });

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

      setPayload(ctx, { in_memory_skipped: inMemorySkipped });

      // Call enqueue_chrome_bookmarks RPC via service role client
      // (authenticated users don't have direct queue access for security)
      const serviceClient = createServerServiceClient();
      const { data: result, error: rpcError } = await serviceClient.rpc(
        "enqueue_chrome_bookmarks",
        {
          p_bookmarks: toJson(uniqueBookmarks),
          p_user_id: userId,
        },
      );

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to queue bookmarks for import",
          operation: "enqueue_chrome_bookmarks",
        });
      }

      const parsed = RpcResultSchema.safeParse(result);
      if (!parsed.success) {
        throw new RecollectApiError("service_unavailable", {
          cause: parsed.error,
          message: "Unexpected response from enqueue operation",
          operation: "enqueue_chrome_bookmarks_parse",
        });
      }

      setPayload(ctx, {
        queued: parsed.data.inserted,
        skipped: parsed.data.skipped + inMemorySkipped,
      });

      return {
        queued: parsed.data.inserted,
        skipped: parsed.data.skipped + inMemorySkipped,
      };
    },
    inputSchema: ChromeBookmarkImportInputSchema,
    outputSchema: ChromeBookmarkImportOutputSchema,
    route: ROUTE,
  }),
);
