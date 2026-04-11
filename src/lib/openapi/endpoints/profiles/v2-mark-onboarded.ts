import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2MarkOnboardedSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    404: {
      description:
        "Profile row not found for the authenticated user (signup trigger missed the row, or it was deleted).",
    },
    503: { description: "Database error while reading or updating the profile" },
  },
  description:
    "Records the timestamp at which the authenticated user finished onboarding. Idempotent: if `onboarded_at` is already set, the original timestamp is preserved and a 200 is returned with no write. Returns 404 only when the profile row is missing entirely — a genuine edge case that would otherwise leave the client stuck in an onboarding loop.",
  method: "patch",
  path: "/v2/profiles/mark-onboarded",
  requestExamples: {
    "empty-body": {
      description: "No body required — the user is derived from the auth cookie.",
      summary: "Empty request",
      value: {},
    },
  },
  responseExamples: {
    "mark-onboarded": {
      description: "Empty response — success is conveyed by the HTTP 200 status.",
      summary: "Success",
      value: {},
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Mark user as onboarded",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
