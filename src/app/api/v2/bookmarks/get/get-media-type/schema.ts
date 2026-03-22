import { z } from "zod";

export const GetMediaTypeInputSchema = z.object({
  url: z.url(),
});

export const GetMediaTypeOutputSchema = z.object({
  error: z.string().nullable(),
  mediaType: z.string().nullable(),
  success: z.boolean(),
});
