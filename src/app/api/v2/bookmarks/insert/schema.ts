import { z } from "zod";

export const BookmarksInsertInputSchema = z.object({
  data: z
    .array(
      z.object({
        description: z.string().nullable().optional(),
        ogImage: z.string().nullable().optional(),
        title: z.string(),
        type: z.string().nullable().optional(),
        url: z.url(),
      }),
    )
    .min(1),
});

export const BookmarksInsertOutputSchema = z.object({
  insertedCount: z.int(),
});
