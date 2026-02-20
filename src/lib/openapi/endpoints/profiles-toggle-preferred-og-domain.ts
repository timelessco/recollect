/**
 * @module Build-time only
 */
import {
	TogglePreferredOgDomainPayloadSchema,
	TogglePreferredOgDomainResponseSchema,
} from "@/app/api/profiles/toggle-preferred-og-domain/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerProfilesTogglePreferredOgDomain() {
	registry.registerPath({
		method: "post",
		path: "/profiles/toggle-preferred-og-domain",
		tags: ["Profiles"],
		summary: "Toggle preferred OG image domain",
		description:
			"Adds or removes a domain from the user's preferred OG image domain list. " +
			"When a domain is in the preferred list, Recollect will use OG images from that domain " +
			"over others. Returns the updated profile with the full domain list.",
		security: [{ [bearerAuth.name]: [] }],
		request: {
			body: {
				required: true,
				content: {
					"application/json": {
						schema: TogglePreferredOgDomainPayloadSchema,
						example: {
							domain: "substack.com",
						},
					},
				},
			},
		},
		responses: {
			200: {
				description: "Domain toggled successfully",
				content: {
					"application/json": {
						schema: apiResponseSchema(TogglePreferredOgDomainResponseSchema),
						example: {
							data: {
								id: "usr_abc123def456",
								preferred_og_domains: ["substack.com", "medium.com"],
							},
							error: null,
						},
					},
				},
			},
			400: { description: "Invalid domain format" },
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
