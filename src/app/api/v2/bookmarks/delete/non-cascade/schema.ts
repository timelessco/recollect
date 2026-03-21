import { z } from "zod";

export const BookmarksDeleteNonCascadeInputSchema = z.object({
  data: z.object({
    id: z.int(),
  }),
});

export const BookmarksDeleteNonCascadeOutputSchema = z.object({}).nullable();
