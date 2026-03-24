import { z } from "zod";

export const BookmarksDeleteNonCascadeInputSchema = z.object({
  data: z.object({
    id: z.int().meta({ description: "ID of the bookmark to delete" }),
  }),
});

export const BookmarksDeleteNonCascadeOutputSchema = z.object({}).nullable();
