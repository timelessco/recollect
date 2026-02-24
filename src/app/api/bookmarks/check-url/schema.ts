import { z } from "zod";

export const CheckUrlInputSchema = z.object({
	url: z.string(),
});

export const CheckUrlOutputSchema = z.discriminatedUnion("exists", [
	z.object({
		exists: z.literal(true),
		bookmarkId: z.string(),
		test_field: z.string(),
	}),
	z.object({ exists: z.literal(false) }),
]);
