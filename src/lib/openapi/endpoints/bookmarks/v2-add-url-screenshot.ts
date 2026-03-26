import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2AddUrlScreenshotSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body — missing or invalid bookmark ID or URL" },
    500: {
      description: "Screenshot capture failed — enrichment still fires in background via after()",
    },
  },
  description:
    "Captures a screenshot of the given URL via an external screenshot API, uploads it to R2, collects additional images and videos, updates bookmark metadata, and fires background enrichment via after(). If screenshot capture fails, enrichment still runs in the background before returning the error.",
  method: "post",
  path: "/v2/bookmark/add-url-screenshot",
  requestExamples: {
    "with-favicon": {
      description:
        "Send the shown request body — captures screenshot, enriches metadata, returns updated bookmark.",
      summary: "Capture screenshot with favicon",
      value: {
        favIcon: "https://example.com/favicon.ico",
        id: 42,
        url: "https://example.com/article",
      } as const,
    },
    "without-favicon": {
      description:
        "Send without `favIcon` — screenshot capture and enrichment still process normally.",
      summary: "Capture screenshot without favicon",
      value: {
        id: 42,
        url: "https://example.com/article",
      } as const,
    },
  },
  response400Examples: {
    "missing-id": {
      description: "Send `{ url: 'https://example.com' }` without `id` — returns 400.",
      summary: "Missing bookmark ID",
      value: {
        data: null,
        error: "Invalid input: expected number, received undefined",
      } as const,
    },
    "missing-url": {
      description: "Send `{ id: 42 }` without `url` — returns 400.",
      summary: "Missing URL",
      value: {
        data: null,
        error: "Invalid input: expected string, received undefined",
      } as const,
    },
  },
  responseExamples: {
    "screenshot-captured": {
      description:
        "Screenshot captured and uploaded. Bookmark metadata updated with screenshot URL.",
      summary: "Screenshot captured successfully",
      value: {
        data: [
          {
            description: "Example article description",
            id: 42,
            meta_data: {
              additionalImages: [],
              additionalVideos: [],
              isPageScreenshot: true,
              screenshot:
                "https://media.recollect.so/bookmarks/public/screenshot_imgs/user123/img-abc.jpg",
            },
            ogImage: "https://example.com/og-image.jpg",
            title: "Example Article Title",
          },
        ],
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Capture URL screenshot, upload to R2, and enrich bookmark metadata",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
