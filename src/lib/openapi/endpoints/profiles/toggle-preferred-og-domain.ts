/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const togglePreferredOgDomainSupplement = {
	path: "/profiles/toggle-preferred-og-domain",
	method: "post",
	tags: ["Profiles"],
	summary: "Toggle preferred OG image domain",
	description:
		"Adds or removes a domain from the user's preferred OG image domain list. When a domain is in the preferred list, Recollect will use OG images from that domain over others. Returns the updated profile with the full domain list.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		domain: "substack.com",
	},
	responseExample: {
		data: {
			id: "550e8400-e29b-41d4-a716-446655440000",
			preferred_og_domains: ["substack.com", "medium.com"],
		},
		error: null,
	},
	additionalResponses: {
		400: { description: "Invalid domain format" },
	},
} satisfies EndpointSupplement;
