import type { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

import {
  ToggleFavoriteCategoryPayloadSchema,
  ToggleFavoriteCategoryResponseSchema,
} from "./schema";

const ROUTE = "toggle-favorite-category";

export type ToggleFavoriteCategoryPayload = z.infer<typeof ToggleFavoriteCategoryPayloadSchema>;

export type ToggleFavoriteCategoryResponse = z.infer<typeof ToggleFavoriteCategoryResponseSchema>;

/**
 * @deprecated Use /api/v2/profiles/toggle-favorite-category instead. Retained for iOS and extension clients.
 */
export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    const { category_id } = data;

    const { data: rows, error: rpcError } = await supabase.rpc("toggle_favorite_category", {
      p_category_id: category_id,
    });

    if (rpcError) {
      return apiError({
        error: rpcError,
        extra: { category_id },
        message: "Failed to toggle favorite category",
        operation: "rpc_toggle_favorite_category",
        route,
        userId: user.id,
      });
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    if (!row?.out_id) {
      const err = new Error("RPC returned no profile");
      return apiError({
        error: err,
        extra: { category_id },
        message: "RPC returned no profile",
        operation: "rpc_toggle_favorite_category",
        route,
        userId: user.id,
      });
    }

    return {
      favorite_categories: row.out_favorite_categories,
      id: row.out_id,
    };
  },
  inputSchema: ToggleFavoriteCategoryPayloadSchema,
  outputSchema: ToggleFavoriteCategoryResponseSchema,
  route: ROUTE,
});
