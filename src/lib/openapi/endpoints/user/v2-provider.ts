/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2ProviderSupplement = {
  additionalResponses: {
    400: { description: "Invalid or missing email query parameter" },
  },
  description:
    "Returns the OAuth provider (e.g. google, email) for a given email address. No authentication required. Returns null if the email has no provider or does not exist.",
  method: "get",
  parameterExamples: {
    email: {
      "email-user": {
        description: "Returns provider: email.",
        summary: "Email/password user",
        value: "another@example.com",
      },
      "google-user": {
        description: "Returns provider: google.",
        summary: "Google OAuth user",
        value: "user@example.com",
      },
      "invalid-email": {
        description: "Returns 400 validation error.",
        summary: "Invalid email format",
        value: "not-an-email",
      },
      "no-provider": {
        description: "Returns provider: null.",
        summary: "Unknown email",
        value: "nobody@example.com",
      },
    },
  },
  path: "/v2/user/get/provider",
  response400Examples: {
    "invalid-email": {
      description: "Omit the `email` parameter or send an invalid value — returns 400.",
      summary: "Invalid or missing email",
      value: {
        error: "Invalid email",
      } as const,
    },
  },
  responseExamples: {
    "email-provider": {
      description: "Send `?email=user@example.com` where the user signed up with email/password.",
      summary: "Email/password user",
      value: {
        provider: "email",
      } as const,
    },
    "google-provider": {
      description: "Send `?email=user@example.com` where the user signed up with Google OAuth.",
      summary: "Google OAuth user",
      value: {
        provider: "google",
      } as const,
    },
    "no-provider": {
      description: "Send `?email=nobody@example.com` — email doesn't exist or has no provider.",
      summary: "Unknown or nonexistent email",
      value: {
        provider: null,
      } as const,
    },
  },
  security: [],
  summary: "Look up OAuth provider by email",
  tags: ["User"],
} satisfies EndpointSupplement;
