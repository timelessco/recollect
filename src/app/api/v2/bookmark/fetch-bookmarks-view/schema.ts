import { z } from "zod";

export const FetchBookmarksViewInputSchema = z.object({
  category_id: z.coerce
    .number()
    .int()
    .min(0)
    .meta({ description: "Category ID to fetch view settings for" }),
});

export const FetchBookmarksViewOutputSchema = z.array(
  z.object({
    category_views: z.unknown().nullable().meta({ description: "View settings for the category" }),
  }),
);
