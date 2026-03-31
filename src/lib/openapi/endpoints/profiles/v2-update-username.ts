import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UpdateUsernameSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    409: { description: "Username already taken" },
  },
  description:
    "Slugifies the provided username (lowercase, ASCII-safe) and updates it for the authenticated user. Returns 409 Conflict if the username is already taken by another user.",
  method: "patch",
  path: "/v2/profiles/update-username",
  requestExamples: {
    "username-with-spaces": {
      description: "Spaces and special characters are slugified — becomes 'john-doe'.",
      summary: "Username with spaces",
      value: { username: "John Doe" },
    },
    "valid-username": {
      description: "A simple username string to be slugified and saved.",
      summary: "Valid username",
      value: { username: "johndoe" },
    },
  },
  response400Examples: {
    "missing-username": {
      description: "The request body did not include a username field.",
      summary: "Missing username field",
      value: {
        error: "Invalid request body",
      } as const,
    },
  },
  responseExamples: {
    "username-updated": {
      description: "The new slugified username stored in the profiles table.",
      summary: "Username updated successfully",
      value: [{ user_name: "johndoe" }] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update authenticated user's username",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
