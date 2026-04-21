/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2CheckUrlSupplement = {
  additionalResponses: {
    401: {
      description:
        "Not authenticated — request rejected before handler runs (Auth session missing)",
    },
    503: { description: "Database error" },
  },
  description:
    "Checks whether the authenticated user has already saved a given URL. Normalizes URLs before comparison (strips tracking params, trailing slashes, lowercases host). Returns the existing bookmark ID if a match is found; otherwise reports `exists: false`. Malformed URLs that fail normalization return `exists: false` rather than a validation error.",
  method: "get",
  parameterExamples: {
    url: {
      "existing-url": {
        description:
          "Send `?url=https://x.com/example/status/2038570523626455337` — returns exists:true with the matching bookmark ID",
        summary: "Existing bookmark",
        value: "https://x.com/example/status/2038570523626455337",
      },
      "new-url": {
        description: "Send `?url=https://example.com/never-saved/post` — returns exists:false",
        summary: "Unsaved URL",
        value: "https://example.com/never-saved/post",
      },
      "malformed-url": {
        description:
          "Send `?url=not-a-url` — URL normalization fails, returns exists:false (no 400)",
        summary: "Malformed URL",
        value: "not-a-url",
      },
    },
  },
  path: "/v2/bookmarks/check-url",
  response400Examples: {
    "missing-url": {
      description: "Omit the `url` parameter — returns 400 with Zod validation error",
      summary: "Missing url query param",
      value: { error: "Invalid input: expected string, received undefined" },
    },
  },
  responseExamples: {
    "match-found": {
      description: "Existing bookmark URL → returns `{bookmarkId, exists:true}`",
      summary: "Match found",
      value: { bookmarkId: "46944", exists: true },
    },
    "no-match": {
      description: "Unsaved URL or malformed input → returns `{exists:false}`",
      summary: "No match",
      value: { exists: false },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Check if a URL is already bookmarked",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
