/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2DeleteApiKeySupplement = {
  description:
    "Nullifies the Gemini API key stored in the authenticated user's profile. The operation is idempotent — calling it when no key is stored still returns success.",
  method: "delete",
  path: "/v2/delete-api-key",
  responseExamples: {
    "api-key-deleted": {
      description:
        "The Gemini API key was removed from the user's profile. Also succeeds when no key was previously stored.",
      summary: "API key deleted",
      value: { success: true } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Delete Gemini API key",
  tags: ["API Key"],
} satisfies EndpointSupplement;
