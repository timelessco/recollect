import { z } from "zod";

export const GetMediaTypeInputSchema = z.object({
  url: z.url(),
});

export const GetMediaTypeOutputSchema = z.object({
  success: z.boolean(),
  mediaType: z.string().nullable(),
  error: z.string().nullable(),
});
