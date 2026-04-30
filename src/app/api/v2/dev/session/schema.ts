import { z } from "zod";

export const DevSessionInputSchema = z.object({});

export const DevSessionOutputSchema = z.object({
  access_token: z.string().meta({
    description: "Supabase JWT access token for the current browser session",
  }),
  expires_at: z.int().optional().meta({
    description: "Unix timestamp (seconds) when the access token expires",
  }),
  user_email: z.string().optional().meta({
    description: "Email of the authenticated user associated with the session",
  }),
});
