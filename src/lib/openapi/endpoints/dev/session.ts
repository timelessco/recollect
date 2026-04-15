/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const devSessionSupplement = {
  additionalResponses: {
    404: { description: "Endpoint disabled in production" },
  },
  description:
    "Dev-only endpoint that returns the current Supabase session token. Must be accessed via browser (relies on session cookies). Returns 404 in production.",
  method: "get",
  path: "/dev/session",
  responseExample: {
    data: {
      access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      expires_at: 1_719_878_400,
      user_email: "user@example.com",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Retrieve current session token for API testing",
  tags: ["Dev"],
} satisfies EndpointSupplement;
