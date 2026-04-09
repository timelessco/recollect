import { z } from "zod";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { ChromeBookmarkImportStatusOutputSchema } from "./schema";

const ROUTE = "v2-chrome-bookmark-import-status";

const StatusInputSchema = z.object({});

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      const { data, error } = await supabase.rpc("get_chrome_bookmark_sync_status", {
        p_user_id: user.id,
      });

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to get sync status",
          operation: "get_status",
        });
      }

      const parsed = ChromeBookmarkImportStatusOutputSchema.parse(data);

      if (ctx?.fields) {
        ctx.fields.pending = parsed.pending;
        ctx.fields.archived = parsed.archived;
      }

      return parsed;
    },
    inputSchema: StatusInputSchema,
    outputSchema: ChromeBookmarkImportStatusOutputSchema,
    route: ROUTE,
  }),
);
