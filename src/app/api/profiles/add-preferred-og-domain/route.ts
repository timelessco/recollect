import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { normalizeDomain } from "@/utils/domain";
import { HttpStatus } from "@/utils/error-utils/common";

const ROUTE = "add-preferred-og-domain";

const AddPreferredOgDomainPayloadSchema = z.object({
	domain: z
		.string()
		.trim()
		.min(1, "Domain cannot be empty")
		.max(253, "Domain too long")
		.regex(/^[\da-z][\d.a-z-]*[\da-z]$/iu, "Invalid domain format")
		.refine(
			(domain) => !/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(domain),
			"IP addresses not allowed",
		)
		.refine((domain) => domain !== "localhost", "localhost not allowed"),
});

export type AddPreferredOgDomainPayload = z.infer<
	typeof AddPreferredOgDomainPayloadSchema
>;

const AddPreferredOgDomainResponseSchema = z.object({
	id: z.string(),
	preferred_og_domains: z.array(z.string()).nullable(),
});

export type AddPreferredOgDomainResponse = z.infer<
	typeof AddPreferredOgDomainResponseSchema
>;

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: AddPreferredOgDomainPayloadSchema,
	outputSchema: AddPreferredOgDomainResponseSchema,
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
