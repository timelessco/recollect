import { type z } from "zod";

import {
	TogglePreferredOgDomainPayloadSchema,
	TogglePreferredOgDomainResponseSchema,
} from "./schema";
import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { normalizeDomain } from "@/utils/domain";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "toggle-preferred-og-domain";

export type TogglePreferredOgDomainPayload = z.infer<
	typeof TogglePreferredOgDomainPayloadSchema
>;

export type TogglePreferredOgDomainResponse = z.infer<
	typeof TogglePreferredOgDomainResponseSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: TogglePreferredOgDomainPayloadSchema,
	outputSchema: TogglePreferredOgDomainResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { domain: rawDomain } = data;

		const domain = normalizeDomain(rawDomain);
		if (!domain) {
			return apiWarn({
				route,
				message: "Invalid domain",
				status: HttpStatus.BAD_REQUEST,
				context: { rawDomain },
			});
		}

		const { data: rows, error: rpcError } = await supabase.rpc(
			"toggle_preferred_og_domain",
			{ p_domain: domain },
		);

		if (rpcError) {
			return apiError({
				route,
				message: "Failed to toggle preferred OG domain",
				error: rpcError,
				operation: "rpc_toggle_preferred_og_domain",
				userId: user.id,
				extra: { domain },
			});
		}

		const row = Array.isArray(rows) ? rows[0] : rows;
		if (!row?.out_id) {
			const err = new Error("RPC returned no profile");
			return apiError({
				route,
				message: "RPC returned no profile",
				error: err,
				operation: "rpc_toggle_preferred_og_domain",
				userId: user.id,
				extra: { domain },
			});
		}

		return {
			id: row.out_id,
			preferred_og_domains: row.out_preferred_og_domains,
		};
	},
});
