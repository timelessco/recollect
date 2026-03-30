import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2RemoveProfilePicSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Nullifies `profile_pic` in the profiles table and deletes the corresponding files from R2 storage. If no profile picture exists, the operation is idempotent — it succeeds without error.",
  method: "delete",
  path: "/v2/profiles/remove-profile-pic",
  requestExamples: {
    "empty-body": {
      description: "No body fields are required — send an empty object.",
      summary: "Empty request body",
      value: {},
    },
  },
  responseExamples: {
    "pic-removed": {
      description: "Returns the updated `profile_pic` column value — always null after removal.",
      summary: "Profile picture removed",
      value: [{ profile_pic: null }] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Remove authenticated user's profile picture",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
