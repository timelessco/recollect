import { z } from "zod";

export const FetchUserProfilePicInputSchema = z.object({
	email: z.string().meta({ description: "User email address" }),
});

export const FetchUserProfilePicOutputSchema = z.array(
	z.object({
		profile_pic: z.string().nullable(),
	}),
);
