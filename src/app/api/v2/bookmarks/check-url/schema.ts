import { z } from "zod";

export const CheckUrlInputSchema = z.object({
  url: z.string().meta({
    description: "Raw URL to check. Normalized server-side before comparison.",
  }),
});

export const CheckUrlOutputSchema = z.discriminatedUnion("exists", [
  z
    .object({
      bookmarkId: z.string().meta({
        description: "ID of the existing bookmark that matches the normalized URL.",
      }),
      exists: z.literal(true).meta({
        description: "A saved bookmark was found for the normalized URL.",
      }),
    })
    .meta({ description: "Match found — returns the existing bookmark ID." }),
  z
    .object({
      exists: z.literal(false).meta({
        description: "No saved bookmark matches the normalized URL.",
      }),
    })
    .meta({ description: "No match found." }),
]);
