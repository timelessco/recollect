import { z } from "zod";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { PROFILES } from "@/utils/constants";
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

const normalizeDomain = (input: string): string | null => {
	try {
		const url = input.includes("://")
			? new URL(input)
			: new URL(`https://${input}`);
		const hostname = url.hostname.toLowerCase();
		return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
	} catch {
		return null;
	}
};

export const POST = createPostApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: AddPreferredOgDomainPayloadSchema,
	outputSchema: AddPreferredOgDomainResponseSchema,
	handler: async ({ data, supabase, user, route }) => {
		const { domain: rawDomain } = data;
		const userId = user.id;

		console.log(`[${route}] API called:`, {
			userId,
			rawDomain,
		});

		const domain = normalizeDomain(rawDomain);
		if (!domain) {
			return apiWarn({
				route,
				message: "Invalid domain",
				status: HttpStatus.BAD_REQUEST,
				context: { rawDomain },
			});
		}

		console.log(`[${route}] Extracted domain:`, { domain });

		// Fetch current profile to get existing preferred_og_domains
		const { data: profileData, error: fetchError } = await supabase
			.from(PROFILES)
			.select("preferred_og_domains")
			.eq("id", userId)
			.single();

		if (fetchError) {
			return apiError({
				route,
				message: "Failed to fetch user profile",
				error: fetchError,
				operation: "fetch_profile",
				userId,
				extra: { domain },
			});
		}

		console.log(`[${route}] Current preferred domains:`, {
			preferredOgDomains: profileData.preferred_og_domains,
		});

		const existingDomains = profileData.preferred_og_domains ?? [];
		const hasDomain = existingDomains.some(
			(existingDomain) => existingDomain.toLowerCase() === domain.toLowerCase(),
		);
		const updatedDomains = hasDomain
			? existingDomains.filter(
					(existingDomain) =>
						existingDomain.toLowerCase() !== domain.toLowerCase(),
				)
			: [...existingDomains, domain];

		const { data: updatedData, error: updateError } = await supabase
			.from(PROFILES)
			.update({
				preferred_og_domains: updatedDomains,
			})
			.eq("id", userId)
			.select("id, preferred_og_domains")
			.single();

		if (updateError) {
			return apiError({
				route,
				message: "Failed to update preferred OG domains",
				error: updateError,
				operation: "update_preferred_og_domains",
				userId,
				extra: { domain, updatedDomains },
			});
		}

		console.log(
			`[${route}] Successfully ${hasDomain ? "removed" : "added"} domain:`,
			{
				domain,
				totalDomains: updatedData.preferred_og_domains?.length ?? 0,
			},
		);

		return updatedData;
	},
});
