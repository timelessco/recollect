import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UploadFileRemainingDataSupplement = {
  additionalResponses: {
    400: {
      description: "Invalid request body — missing or invalid bookmark ID, media type, or URL",
    },
  },
  description:
    "Processes remaining file metadata after upload: generates blurhash, runs AI image-to-text analysis (OCR, caption, keywords), merges metadata with existing values, and auto-assigns collections. This is a background enrichment operation typically triggered after the file has been uploaded to R2.",
  method: "post",
  path: "/v2/file/upload-file-remaining-data",
  requestExamples: {
    "image-file": {
      description:
        "Send the shown request body — returns `{ status: 'completed' }` after enrichment.",
      summary: "Enrich uploaded image file",
      value: {
        id: 42,
        mediaType: "image/png",
        publicUrl: "https://r2.example.com/uploads/user123/file.png",
      } as const,
    },
    "audio-file": {
      description: "Audio files use a fallback OG image for AI analysis instead of the file URL.",
      summary: "Enrich uploaded audio file",
      value: {
        id: 43,
        mediaType: "audio/mpeg",
        publicUrl: "https://r2.example.com/uploads/user123/track.mp3",
      } as const,
    },
  },
  response400Examples: {
    "missing-id": {
      description: "Send without `id` — returns 400.",
      summary: "Missing bookmark ID",
      value: {
        data: null,
        error: "Invalid input: expected number, received undefined",
      } as const,
    },
    "missing-url": {
      description: "Send without `publicUrl` — returns 400.",
      summary: "Missing public URL",
      value: {
        data: null,
        error: "Invalid input: expected string, received undefined",
      } as const,
    },
  },
  responseExamples: {
    "enrichment-completed": {
      description:
        "File enrichment completed successfully. Blurhash generated, AI processing done, metadata merged.",
      summary: "Enrichment completed",
      value: {
        data: { status: "completed" },
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Enrich uploaded file with blurhash, AI analysis, and metadata",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
