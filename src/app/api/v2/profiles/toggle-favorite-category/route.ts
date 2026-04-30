import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";

import { ToggleFavoriteCategoryInputSchema, ToggleFavoriteCategoryOutputSchema } from "./schema";

const ROUTE = "v2-profiles-toggle-favorite-category";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.category_id = data.category_id;
      }

      const { data: rows, error: rpcError } = await supabase.rpc("toggle_favorite_category", {
        p_category_id: data.category_id,
      });

      if (rpcError) {
        throw new RecollectApiError("service_unavailable", {
          cause: rpcError,
          message: "Failed to toggle favorite category",
          operation: "rpc_toggle_favorite_category",
        });
      }

      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row?.out_id) {
        throw new RecollectApiError("not_found", {
          message: "Profile not found for toggle",
          operation: "rpc_toggle_favorite_category",
        });
      }

      setPayload(ctx, {
        favorite_count: row.out_favorite_categories.length,
        toggled_in: row.out_favorite_categories.includes(data.category_id),
      });

      return {
        favorite_categories: row.out_favorite_categories,
        id: row.out_id,
      };
    },
    inputSchema: ToggleFavoriteCategoryInputSchema,
    outputSchema: ToggleFavoriteCategoryOutputSchema,
    route: ROUTE,
  }),
);
