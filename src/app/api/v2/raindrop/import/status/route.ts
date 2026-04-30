import { z } from "zod";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

import { RaindropImportStatusOutputSchema } from "./schema";

const ROUTE = "v2-raindrop-import-status";

const StatusInputSchema = z.object({});

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      const { data, error } = await supabase.rpc("get_raindrop_sync_status", {
        p_user_id: user.id,
      });

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to get sync status",
          operation: "get_status",
        });
      }

      const parsed = RaindropImportStatusOutputSchema.parse(data);

      setPayload(ctx, {
        pending: parsed.pending,
        archived: parsed.archived,
      });

      return parsed;
    },
    inputSchema: StatusInputSchema,
    outputSchema: RaindropImportStatusOutputSchema,
    route: ROUTE,
  }),
);
