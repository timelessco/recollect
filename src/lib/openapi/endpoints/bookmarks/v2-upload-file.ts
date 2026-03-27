import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UploadFileSupplement = {
  additionalResponses: {
    400: { description: "Invalid request body — missing file name, type, or upload path" },
    403: {
      description: "User is not the owner or collaborator of the target category",
    },
  },
  description:
    "Processes a file upload: file is already uploaded to R2 client-side (Vercel 4.5MB limit), this route receives JSON metadata, validates category ownership, inserts the bookmark, and fires background enrichment. Videos are processed inline (blurhash + AI caption), PDFs skip enrichment, and all other file types fire uploadFileRemainingData via after().",
  method: "post",
  path: "/v2/file/upload-file",
  requestExamples: {
    "image-upload": {
      description:
        "Send file metadata after client-side R2 upload — inserts bookmark and fires background enrichment.",
      summary: "Upload image file metadata",
      value: {
        category_id: 0,
        name: "screenshot.png",
        type: "image/png",
        uploadFileNamePath: "screenshot.png",
      } as const,
    },
    "video-with-thumbnail": {
      description:
        "Send with `thumbnailPath` for video files — processes thumbnail inline (blurhash + AI caption).",
      summary: "Upload video file with thumbnail",
      value: {
        category_id: 5,
        name: "demo.mp4",
        thumbnailPath: "files/public/user-id/thumbnail.jpg",
        type: "video/mp4",
        uploadFileNamePath: "demo.mp4",
      } as const,
    },
  },
  response400Examples: {
    "missing-name": {
      description: "Send without `name` — returns 400.",
      summary: "Missing file name",
      value: {
        data: null,
        error: "Invalid input: expected string, received undefined",
      } as const,
    },
  },
  responseExamples: {
    "file-uploaded": {
      description: "File bookmark created. Returns inserted bookmark ID.",
      summary: "File uploaded successfully",
      value: {
        data: [{ id: 42 }],
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Process file upload metadata, insert bookmark, and fire conditional enrichment",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
