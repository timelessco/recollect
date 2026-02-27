import { z } from "zod";

export const UpdateUsernameInputSchema = z.object({
	username: z.string(),
});

export const UpdateUsernameOutputSchema = z.array(
	z.object({
		user_name: z.string().nullable(),
	}),
);
