import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const pdfThumbnailSupplement = {
  additionalResponses: {
    400: { description: "Invalid URL format" },
  },
  description:
    "Sends a PDF URL to an external screenshot service and returns the generated thumbnail's storage path and public URL. Used by the browser extension to generate preview images for bookmarked PDFs.",
  method: "post",
  path: "/pdf-thumbnail",
  requestExample: {
    url: "https://example.com/document.pdf",
  },
  responseExample: {
    data: {
      publicUrl: "https://cdn.example.com/pdf-thumbnails/abc123.png",
    },
    error: null,
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Generate a thumbnail for a PDF URL",
  tags: ["PDF"],
} satisfies EndpointSupplement;
