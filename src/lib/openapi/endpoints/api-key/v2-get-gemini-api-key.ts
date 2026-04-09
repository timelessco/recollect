/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2GetGeminiApiKeySupplement = {
  additionalResponses: {
    404: { description: "No Gemini API key is stored for this user" },
  },
  description:
    "Fetches and decrypts the Gemini API key stored in the authenticated user's profile. Returns 404 when no key has been saved.",
  method: "get",
  path: "/v2/get-gemini-api-key",
  responseExamples: {
    "api-key-found": {
      description: "The stored key was decrypted and returned as plaintext.",
      summary: "API key retrieved",
      value: { apiKey: "AIzaSyAbc123ExampleKeyXYZ" } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Retrieve decrypted Gemini API key",
  tags: ["API Key"],
} satisfies EndpointSupplement;
