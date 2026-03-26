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
      description: "Enrich bookmark with a known favicon URL.",
      summary: "Enrich bookmark with favicon",
      value: {
        favIcon: "https://example.com/favicon.ico",
        id: 42,
        url: "https://example.com/article",
      } as const,
    },
    "without-favicon": {
      description:
        "Enrich bookmark without favicon — enrichment will still process OG images and AI.",
      summary: "Enrich bookmark without favicon",
      value: {
        id: 42,
        url: "https://example.com/article",
      } as const,
    },
  },
  response400Examples: {
    "missing-id": {
      description: "Fails when bookmark ID is not provided.",
      summary: "Missing bookmark ID",
      value: {
        data: null,
        error: "id: Required",
      } as const,
    },
    "missing-url": {
      description: "Fails when bookmark URL is not provided.",
      summary: "Missing bookmark URL",
      value: {
        data: null,
        error: "url: Required",
      } as const,
    },
  },
  responseExamples: {
    "enrichment-completed": {
      description:
        "Bookmark enrichment completed successfully. Images uploaded, blurhash generated, AI processing done.",
      summary: "Enrichment completed",
      value: {
        data: { status: "completed" },
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Enrich bookmark with images, blurhash, AI caption/OCR, and metadata",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
