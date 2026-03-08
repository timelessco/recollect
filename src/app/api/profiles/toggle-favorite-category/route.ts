import { type z } from "zod";

import {
	ToggleFavoriteCategoryPayloadSchema,
	ToggleFavoriteCategoryResponseSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";

const ROUTE = "toggle-favorite-category";

export type ToggleFavoriteCategoryPayload = z.infer<
	typeof ToggleFavoriteCategoryPayloadSchema
>;

export type ToggleFavoriteCategoryResponse = z.infer<
	typeof ToggleFavoriteCategoryResponseSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: ToggleFavoriteCategoryPayloadSchema,
	outputSchema: ToggleFavoriteCategoryResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { category_id } = data;

		const { data: rows, error: rpcError } = await supabase.rpc(
			"toggle_favorite_category",
			{ p_category_id: category_id },
		);

		if (rpcError) {
			return apiError({
				route,
				message: "Failed to toggle favorite category",
				error: rpcError,
				operation: "rpc_toggle_favorite_category",
				userId: user.id,
				extra: { category_id },
			});
		}

		const row = Array.isArray(rows) ? rows[0] : rows;
		if (!row?.out_id) {
			const err = new Error("RPC returned no profile");
			return apiError({
				route,
				message: "RPC returned no profile",
				error: err,
				operation: "rpc_toggle_favorite_category",
				userId: user.id,
				extra: { category_id },
			});
		}

		return {
			id: row.out_id,
			favorite_categories: row.out_favorite_categories,
		};
	},
});
