/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2GetPdfBufferSupplement = {
  description:
    "Fetches the PDF at the given URL and streams the raw binary back with `Content-Type: application/pdf`. Used by the lightbox to render inline PDFs without CORS issues. 30-second timeout.",
  method: "get",
  parameterExamples: {
    url: {
      "valid-pdf": {
        description: "A publicly accessible PDF URL.",
        summary: "Public PDF document",
        value: "https://example.com/document.pdf",
      },
    },
  },
  path: "/v2/bookmarks/get/get-pdf-buffer",
  security: [],
  summary: "Proxy-fetch a PDF and return the binary buffer",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
