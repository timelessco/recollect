import { z } from "zod";

export const UploadFileRemainingDataInputSchema = z.object({
  id: z.int().meta({ description: "Bookmark ID of the uploaded file" }),
  mediaType: z.string().nullable().meta({ description: "MIME type of the uploaded file" }),
  publicUrl: z.url().meta({ description: "R2 public URL of the uploaded file" }),
});

export const UploadFileRemainingDataOutputSchema = z.object({
  status: z.string().meta({ description: "Processing status" }),
});
