import { z } from "zod";

export const FetchUserProfilePicInputSchema = z.object({
	email: z.email().meta({ description: "User email address" }),
});

export const FetchUserProfilePicOutputSchema = z.array(
	z.object({
		profile_pic: z.string().nullable(),
	}),
);
