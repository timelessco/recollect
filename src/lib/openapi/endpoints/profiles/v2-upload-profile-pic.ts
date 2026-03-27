import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UploadProfilePicSupplement = {
  additionalResponses: {
    400: { description: "Invalid form data, missing file, or empty file" },
    401: { description: "Not authenticated" },
  },
  description:
    "Uploads a new profile picture for the authenticated user. Accepts multipart/form-data with a 'file' field containing the image. The old profile picture is deleted from R2 storage before the new one is uploaded.\n\n**NOTE:** The OpenAPI generator hardcodes JSON request bodies. The actual content type is `multipart/form-data`. Scalar's Try It panel does not support multipart file uploads — test this endpoint via curl instead:\n\n```\ncurl -X POST http://localhost:3000/api/v2/settings/upload-profile-pic \\\n  -H 'Cookie: sb-access-token=TOKEN' \\\n  -F 'file=@/path/to/image.png'\n```",
  method: "post",
  path: "/v2/settings/upload-profile-pic",
  responseExamples: {
    "upload-success": {
      description: "Profile picture uploaded, DB updated, old files cleaned up.",
      summary: "Successful upload",
      value: {
        data: { success: true },
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Upload authenticated user's profile picture",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
