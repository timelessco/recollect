import { z } from "zod";

export const PdfThumbnailInputSchema = z.object({
  url: z.url("Invalid URL format").meta({
    description: "Public URL of the PDF to generate a thumbnail for.",
  }),
});

export const PdfThumbnailOutputSchema = z.object({
  publicUrl: z.string().meta({
    description:
      "Public CDN URL of the generated thumbnail image. Empty string when the upstream service did not return a URL.",
  }),
});

export type PdfThumbnailOutput = z.infer<typeof PdfThumbnailOutputSchema>;
