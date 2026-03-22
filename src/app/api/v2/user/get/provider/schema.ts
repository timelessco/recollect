import { z } from "zod";

export const GetProviderInputSchema = z.object({
  email: z.email(),
});

export const GetProviderOutputSchema = z.object({
  provider: z.string().nullable(),
});
