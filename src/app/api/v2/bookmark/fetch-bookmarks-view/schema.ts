import { z } from "zod";

export const FetchBookmarksViewInputSchema = z.object({
	category_id: z.int(),
});

export const FetchBookmarksViewOutputSchema = z.array(
	z.object({
		category_views: z.unknown().nullable(),
	}),
);
