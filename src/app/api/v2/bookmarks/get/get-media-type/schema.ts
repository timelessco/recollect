import { z } from "zod";

export const GetMediaTypeInputSchema = z.object({
  url: z.url().meta({ description: "URL to check the media type of" }),
});

export const GetMediaTypeOutputSchema = z.object({
  error: z.string().nullable().meta({ description: "Error message if the check failed" }),
  mediaType: z.string().nullable().meta({ description: "Detected Content-Type of the URL" }),
  success: z.boolean().meta({ description: "Whether the media type check succeeded" }),
});
