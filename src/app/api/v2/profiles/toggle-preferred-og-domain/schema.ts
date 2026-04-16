import { z } from "zod";

export const TogglePreferredOgDomainInputSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Domain cannot be empty")
    .max(253, "Domain too long")
    .regex(/^[\da-z][\d.a-z-]*[\da-z]$/iu, "Invalid domain format")
    .refine((domain) => !/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(domain), "IP addresses not allowed")
    .refine((domain) => domain !== "localhost", "localhost not allowed")
    .meta({
      description:
        "Domain or URL to toggle in the user's preferred OG image domain list. URLs are normalized to hostname (www. stripped, lowercased). IP addresses and `localhost` are rejected.",
    }),
});

export const TogglePreferredOgDomainOutputSchema = z.object({
  id: z.string().meta({ description: "User profile ID (auth user UUID)." }),
  preferred_og_domains: z.array(z.string()).meta({
    description:
      "Updated list of preferred OG image domains after the toggle. The normalized domain will be present if it was added, absent if it was removed.",
  }),
});
