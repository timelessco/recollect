import { z } from "zod";

export const RemoveProfilePicInputSchema = z.object({});

export const RemoveProfilePicOutputSchema = z.array(
	z.object({
		profile_pic: z.string().nullable(),
	}),
);
