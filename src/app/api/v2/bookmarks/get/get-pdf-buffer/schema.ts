import { z } from "zod";

export const GetPdfBufferInputSchema = z.object({
  url: z.url().meta({ description: "URL of the PDF to fetch" }),
});

// Binary response — schema serves OpenAPI scanner only (handler returns raw Response)
export const GetPdfBufferOutputSchema = z
  .string()
  .meta({ description: "Raw binary content of the PDF" });
