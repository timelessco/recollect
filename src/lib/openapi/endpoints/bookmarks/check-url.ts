/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const checkUrlSupplement = {
  description:
    "Checks whether the authenticated user has already saved a given URL. Normalizes URLs before comparison (strips tracking params, trailing slashes, lowercases host). Returns the bookmark ID if found.",
  method: "get",
  path: "/bookmarks/check-url",
  responseExample: {
    data: { bookmarkId: "42", exists: true },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Check if a URL is already bookmarked",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
