/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2DevSessionSupplement = {
  additionalResponses: {
    401: { description: "No active browser session" },
    404: { description: "Endpoint disabled outside development" },
  },
  description:
    "Dev-only endpoint that returns the current Supabase session token for API testing. Must be accessed via browser — relies on session cookies, not bearer tokens. Returns 404 in production.",
  method: "get",
  path: "/v2/dev/session",
  responseExamples: {
    "logged-in": {
      description:
        "Send the request from a browser tab with an active Supabase session — returns the access token, expiry, and user email.",
      summary: "Active session",
      value: {
        access_token: "eyJhbGciOi...redacted",
        expires_at: 1_776_248_998,
        user_email: "user@example.com",
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Retrieve current session token for API testing",
  tags: ["Dev"],
} satisfies EndpointSupplement;
