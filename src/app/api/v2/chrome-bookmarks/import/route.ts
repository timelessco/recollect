import { z } from "zod";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getFreeTierContext, partitionByCutoff } from "@/lib/api-helpers/free-tier-gate";
import { getServerContext } from "@/lib/api-helpers/server-context";
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
    handler: async ({ data, supabase, user }) => {
      const userId = user.id;

      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = userId;
        ctx.fields.bookmark_count = data.bookmarks.length;
      }

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

      if (ctx?.fields) {
        ctx.fields.in_memory_skipped = inMemorySkipped;
      }

      // Free-tier cutoff: silently drop bookmarks predating signup. The Chrome
      // extension transforms native `dateAdded` (ms epoch) to ISO `inserted_at`
      // upstream; missing/empty/unparsable timestamps drop for free users.
      const freeTier = await getFreeTierContext(supabase, userId, user.created_at);
      const { kept: allowedBookmarks, skipped: cutoffSkipped } = freeTier.isFree
        ? partitionByCutoff(
            uniqueBookmarks,
            (bookmark) => bookmark.inserted_at,
            freeTier.freeTierCutoffMs,
          )
        : { kept: uniqueBookmarks, skipped: 0 };

      if (ctx?.fields) {
        ctx.fields.free_tier_skipped = cutoffSkipped;
      }

      if (allowedBookmarks.length === 0) {
        return {
          queued: 0,
          skipped: inMemorySkipped + cutoffSkipped,
        };
      }

      // Call enqueue_chrome_bookmarks RPC via service role client
      // (authenticated users don't have direct queue access for security)
      const serviceClient = createServerServiceClient();
      const { data: result, error: rpcError } = await serviceClient.rpc(
        "enqueue_chrome_bookmarks",
        {
          p_bookmarks: toJson(allowedBookmarks),
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

      const totalSkipped = parsed.data.skipped + inMemorySkipped + cutoffSkipped;

      if (ctx?.fields) {
        ctx.fields.queued = parsed.data.inserted;
        ctx.fields.skipped = totalSkipped;
      }

      return {
        queued: parsed.data.inserted,
        skipped: totalSkipped,
      };
    },
    inputSchema: ChromeBookmarkImportInputSchema,
    outputSchema: ChromeBookmarkImportOutputSchema,
    route: ROUTE,
  }),
);
