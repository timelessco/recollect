/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2ApiKeySupplement = {
  additionalResponses: {
    400: {
      description: "Validation failed — API key is invalid or rejected by Google AI",
    },
  },
  description:
    "Validates the provided Gemini API key against the Google AI API, encrypts it with AES, and upserts it to the authenticated user's profile. Returns a 400 if the key fails validation.",
  method: "put",
  path: "/v2/api-key",
  requestExamples: {
    "save-api-key": {
      description:
        "Provide a valid Gemini API key. The server validates it via a test generation call before storing.",
      summary: "Save a valid Gemini API key",
      value: {
        apikey: "AIzaSyAbc123ExampleKeyXYZ",
      } as const,
    },
  },
  response400Examples: {
    "invalid-api-key": {
      description: "The provided API key failed validation against the Google AI API.",
      summary: "Invalid API key",
      value: {
        error: "Invalid API key",
      } as const,
    },
  },
  responseExamples: {
    "api-key-saved": {
      description: "The Gemini API key was validated and encrypted successfully.",
      summary: "API key saved",
      value: { success: true } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Save Gemini API key",
  tags: ["API Key"],
} satisfies EndpointSupplement;
