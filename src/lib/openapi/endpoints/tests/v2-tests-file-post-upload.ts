/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2TestsFilePostUploadSupplement = {
  description:
    "Test-only endpoint for file upload. Inserts a bookmark record, uploads file to R2 storage, and triggers remaining-data processing via after(). Requires user authentication. Not for production use — designed for automated test workflows.",
  method: "post",
  path: "/v2/tests/file/post/upload",
  requestExamples: {
    "image-upload": {
      description: "Upload an image file to the default (Uncategorized) category",
      summary: "Image file upload",
      value: {
        category_id: "0",
        name: "test-screenshot.png",
        thumbnailPath: null,
        type: "image/png",
        uploadFileNamePath: "test-screenshot.png",
      },
    },
    "video-upload": {
      description: "Upload a video file with a thumbnail to a specific category",
      summary: "Video file upload with thumbnail",
      value: {
        category_id: "42",
        name: "demo-video.mp4",
        thumbnailPath: "files/public/abc-123/temp-thumbnail.png",
        type: "video/mp4",
        uploadFileNamePath: "demo-video.mp4",
      },
    },
  },
  responseExamples: {
    "file-uploaded": {
      description: "Returns the inserted bookmark row with its database ID.",
      summary: "File uploaded successfully",
      value: [{ id: 12_345 }] as const,
    },
  },
  summary: "Upload test file",
  tags: ["Tests"],
} satisfies EndpointSupplement;
