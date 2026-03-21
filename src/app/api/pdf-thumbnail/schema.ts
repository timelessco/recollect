import { z } from "zod";

export const PdfThumbnailInputSchema = z.object({
  url: z.url("Invalid URL format"),
});

export const PdfThumbnailOutputSchema = z.object({
  publicUrl: z.string(),
});

export type PdfThumbnailOutput = z.infer<typeof PdfThumbnailOutputSchema>;
