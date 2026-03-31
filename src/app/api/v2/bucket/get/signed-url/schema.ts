import { z } from "zod";

export const GetSignedUrlInputSchema = z.object({
  contentType: z.string().meta({ description: "MIME type of the file to be uploaded" }),
  filePath: z.string().meta({ description: "Target path in the R2 bucket" }),
});

export const GetSignedUrlOutputSchema = z.object({
  signedUrl: z.string().meta({ description: "Pre-signed URL for direct upload to R2" }),
});
