import { z } from "zod";

export const PdfScreenshotInputSchema = z.object({
	url: z.url("Invalid URL format"),
});

export type PdfScreenshotInput = z.infer<typeof PdfScreenshotInputSchema>;

export const PdfScreenshotOutputSchema = z.object({
	path: z.string(),
	publicUrl: z.string(),
});

export type PdfScreenshotOutput = z.infer<typeof PdfScreenshotOutputSchema>;
