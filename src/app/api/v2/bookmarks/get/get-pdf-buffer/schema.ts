import { z } from "zod";

export const GetPdfBufferInputSchema = z.object({
	url: z.url(),
});

// Binary response — schema serves OpenAPI scanner only (handler returns raw Response)
export const GetPdfBufferOutputSchema = z.string();
