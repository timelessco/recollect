import { z } from "zod/v4";

/**
 * Input schema for the OpenAPI scanner only.
 * The actual input is multipart/form-data with a "file" field — not expressible in JSON schema.
 */
export const UploadProfilePicInputSchema = z.object({}).meta({
  description:
    "Multipart form data with a 'file' field containing the profile picture image. This endpoint accepts multipart/form-data, NOT JSON.",
});

export const UploadProfilePicOutputSchema = z.object({
  success: z.boolean().meta({ description: "Whether the upload succeeded" }),
});
