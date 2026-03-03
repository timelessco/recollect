import { z } from "zod";

export const FetchUserTagsInputSchema = z.object({});

export const FetchUserTagsOutputSchema = z.array(
	z.object({
		created_at: z.string().nullable(),
		id: z.int(),
		name: z.string().nullable(),
		user_id: z.string().nullable(),
	}),
);
