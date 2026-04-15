/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

import { bearerAuth } from "@/lib/openapi/registry";

export const v2PdfThumbnailSupplement = {
  additionalResponses: {
    400: { description: "Invalid URL format" },
    401: { description: "Not authenticated" },
    503: { description: "PDF Thumbnail service unavailable or misconfigured" },
  },
  description:
    "Sends a PDF URL to an external screenshot service and returns the generated thumbnail's public URL. Used by the browser extension to generate preview images for bookmarked PDFs.",
  method: "post",
  path: "/v2/pdf-thumbnail",
  requestExamples: {
    "generate-thumbnail": {
      description: "Send a public PDF URL — returns the generated thumbnail's public CDN URL.",
      summary: "Generate PDF thumbnail",
      value: { url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    },
  },
  response400Examples: {
    "missing-url": {
      description: "Send `{}` — returns 400 because `url` is required.",
      summary: "Missing url field",
      value: { error: "Invalid URL format" },
    },
    "malformed-url": {
      description:
        'Send `{ "url": "not-a-url" }` — returns 400 because the value is not a valid URL.',
      summary: "Malformed url",
      value: { error: "Invalid URL format" },
    },
  },
  responseExamples: {
    "generate-thumbnail": {
      description: "Upstream screenshot service produced a thumbnail and returned its CDN URL.",
      summary: "Thumbnail generated",
      value: {
        publicUrl:
          "https://media.recollect.so/pdf_thumbnails/550e8400-e29b-41d4-a716-446655440000/thumb-dummy.png",
      },
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Generate a thumbnail for a PDF URL",
  tags: ["PDF"],
} satisfies EndpointSupplement;
