/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2TogglePreferredOgDomainSupplement = {
  additionalResponses: {
    400: {
      description:
        "Invalid domain format — empty, malformed, IP address, `localhost`, or fails post-normalization URL parsing.",
    },
    401: { description: "Not authenticated" },
    404: { description: "Profile row not found for the authenticated user" },
    503: { description: "Database error while running the toggle RPC" },
  },
  description:
    "Adds or removes a domain from the authenticated user's preferred OG image domain list. Input is normalized to a bare hostname before toggling (protocol and `www.` prefix stripped, lowercased). When a domain is already preferred it is removed; otherwise it is appended. When Recollect finds OG images from multiple domains for a page, images from a preferred domain win. The operation is idempotent in pairs — two successive calls with the same input return the list to its original state. Returns the user's profile ID and the updated domain list.",
  method: "post",
  path: "/v2/profiles/toggle-preferred-og-domain",
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Toggle a preferred OG image domain",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
