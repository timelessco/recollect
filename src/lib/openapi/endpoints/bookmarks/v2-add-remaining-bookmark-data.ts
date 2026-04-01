import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2AddRemainingBookmarkDataSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body — missing or invalid bookmark ID/URL" },
  },
  description:
    "Enriches a bookmark with remaining data: downloads and uploads OG/scraper images to R2, generates blurhash, runs AI caption/OCR via Gemini, auto-assigns collections, merges meta_data, and revalidates public category pages. This is a long-running enrichment operation typically triggered after initial bookmark creation.",
  method: "post",
  path: "/v2/bookmark/add-remaining-bookmark-data",
  requestExamples: {
    "with-favicon": {
      description:
        "Send the shown request body — returns `{ status: 'completed' }` after enrichment.",
      summary: "Enrich bookmark with favicon",
      value: {
        favIcon: "https://example.com/favicon.ico",
        id: 42,
        url: "https://example.com/article",
      } as const,
    },
    "without-favicon": {
      description:
        "Send without `favIcon` — enrichment still processes OG images, blurhash, and AI.",
      summary: "Enrich bookmark without favicon",
      value: {
        id: 42,
        url: "https://example.com/article",
      } as const,
    },
  },
  response400Examples: {
    "invalid-url": {
      description: "Send `{ id: 42, url: 'not-a-url' }` — returns 400 for invalid URL format.",
      summary: "Invalid URL format",
      value: {
        error: "Invalid URL",
      } as const,
    },
    "missing-id": {
      description: "Send `{ url: 'https://example.com' }` without `id` — returns 400.",
      summary: "Missing bookmark ID",
      value: {
        error: "Invalid input: expected number, received undefined",
      } as const,
    },
    "missing-url": {
      description: "Send `{ id: 42 }` without `url` — returns 400.",
      summary: "Missing bookmark URL",
      value: {
        error: "Invalid input: expected string, received undefined",
      } as const,
    },
  },
  responseExamples: {
    "enrichment-completed": {
      description:
        "Bookmark enrichment completed successfully. Images uploaded, blurhash generated, AI processing done.",
      summary: "Enrichment completed",
      value: { status: "completed" } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Enrich bookmark with images, blurhash, AI caption/OCR, and metadata",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
