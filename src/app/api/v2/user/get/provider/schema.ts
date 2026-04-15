import { z } from "zod";

export const GetProviderInputSchema = z.object({
  email: z.email().meta({ description: "Email address to look up the OAuth provider for" }),
});

export const GetProviderOutputSchema = z.object({
  provider: z.string().nullable().meta({ description: "OAuth provider name for the account" }),
});
