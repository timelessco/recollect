import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2MarkOnboardingCompleteSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    503: { description: "Database error while updating profile" },
  },
  description:
    "Marks the authenticated user's onboarding as complete. Idempotent — calling this on a profile where the flag is already true is a harmless re-UPDATE. Called fire-and-forget from the welcome modal on dismiss.",
  method: "post",
  path: "/v2/profiles/mark-onboarding-complete",
  requestExamples: {
    "empty-body": {
      description: "No body required — the user is derived from the auth cookie.",
      summary: "Empty request",
      value: {},
    },
  },
  responseExamples: {
    "onboarding-marked-complete": {
      description: "Confirmation that the flag was written.",
      summary: "Success",
      value: { onboarding_complete: true },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Mark onboarding complete",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
