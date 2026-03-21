/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2GetPdfBufferSupplement = {
  path: "/v2/bookmarks/get/get-pdf-buffer",
  method: "get",
  tags: ["Bookmarks"],
  summary: "Proxy-fetch a PDF and return the binary buffer",
  description:
    "Fetches the PDF at the given URL and streams the raw binary back with `Content-Type: application/pdf`. Used by the lightbox to render inline PDFs without CORS issues. 30-second timeout.",
  security: [],
  parameterExamples: {
    url: {
      "valid-pdf": {
        summary: "Public PDF document",
        description: "A publicly accessible PDF URL.",
        value: "https://example.com/document.pdf",
      },
    },
  },
} satisfies EndpointSupplement;
