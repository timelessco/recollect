/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2BucketGetSignedUrlSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Generates a pre-signed upload URL for direct client-side uploads to R2 storage. The URL is valid for 1 hour (3600 seconds). Used by the frontend to upload profile pictures and other files without routing binary data through the API server.",
  method: "get",
  parameterExamples: {
    filePath: {
      "profile-image": {
        description: "Profile image upload path",
        summary: "Profile image",
        value: "users/abc-123/avatar.jpg",
      },
    },
  },
  path: "/v2/bucket/get/signed-url",
  responseExamples: {
    "happy-path": {
      description: "Returns pre-signed URL valid for 1 hour",
      summary: "Signed upload URL",
      value: {
        signedUrl: "https://r2.example.com/signed/users/abc-123/avatar.jpg?X-Amz-Signature=abc123",
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Generate pre-signed upload URL",
  tags: ["Bucket"],
} satisfies EndpointSupplement;
