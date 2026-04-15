/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2CheckGeminiApiKeySupplement = {
  description:
    "Returns whether the authenticated user has a Gemini API key stored in their profile. Used to conditionally enable AI-powered features in the UI.",
  method: "get",
  path: "/v2/check-gemini-api-key",
  responseExamples: {
    "has-api-key": {
      description:
        "No parameters needed — authenticate as a user with a Gemini API key configured. Returns `true`.",
      summary: "User has a Gemini API key",
      value: { hasApiKey: true } as const,
    },
    "no-api-key": {
      description:
        "No parameters needed — authenticate as a user without a Gemini API key. Returns `false`.",
      summary: "User has no Gemini API key",
      value: { hasApiKey: false } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Check if user has a Gemini API key configured",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
