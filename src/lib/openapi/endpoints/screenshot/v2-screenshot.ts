/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2ScreenshotSupplement = {
  description:
    "Captures a screenshot for a bookmark (PDF via external API or regular via screenshot service), uploads to R2, runs AI image captioning, generates blurhash, and auto-assigns collections. Called by the queue worker, not directly by users.",
  method: "post",
  path: "/v2/screenshot",
  requestExamples: {
    "regular-url": {
      description: "Queue message for a regular webpage screenshot",
      summary: "Regular URL screenshot",
      value: {
        id: 12_345,
        message: { msg_id: 42 },
        queue_name: "ai-embeddings",
        url: "https://example.com/article",
        user_id: "abc-123-def",
      },
    },
    "pdf-url": {
      description: "Queue message for a PDF document thumbnail",
      summary: "PDF thumbnail generation",
      value: {
        id: 12_346,
        mediaType: "application/pdf",
        message: { msg_id: 43 },
        queue_name: "ai-embeddings",
        url: "https://example.com/document.pdf",
        user_id: "abc-123-def",
      },
    },
  },
  responseExample: {
    data: { message: "Screenshot captured and uploaded successfully" },
    error: null,
  },
  security: [],
  summary: "Process screenshot queue message",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
