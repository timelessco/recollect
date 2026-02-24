import { z } from "zod";

export const DevSessionInputSchema = z.object({});

export const DevSessionOutputSchema = z.object({
	access_token: z.string(),
	expires_at: z.number().optional(),
	user_email: z.string().optional(),
});
