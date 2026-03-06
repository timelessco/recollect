import { z } from "zod";

export const TogglePreferredOgDomainPayloadSchema = z.object({
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

export const TogglePreferredOgDomainResponseSchema = z.object({
	id: z.string(),
	preferred_og_domains: z.array(z.string()).nullable(),
});
