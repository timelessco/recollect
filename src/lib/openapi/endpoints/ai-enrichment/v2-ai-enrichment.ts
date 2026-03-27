/**
 * @module Build-time only
 */
import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2AiEnrichmentSupplement = {
  description:
    "Enriches bookmark metadata using AI — handles platform-specific URL validation (Twitter, Instagram), image re-upload for Raindrop/Instagram bookmarks, metadata extraction via enrichMetadata, and collection auto-assignment. Called by the queue worker.",
  method: "post",
  path: "/v2/ai-enrichment",
  requestExamples: {
    "standard-bookmark": {
      description: "Queue message for a standard bookmark AI enrichment",
      summary: "Standard bookmark enrichment",
      value: {
        id: 12_345,
        message: {
          message: {
            meta_data: {
              favIcon: "https://example.com/favicon.ico",
            },
          },
          msg_id: 42,
        },
        ogImage: "https://example.com/og-image.jpg",
        queue_name: "ai-embeddings",
        url: "https://example.com/article",
        user_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    },
    "twitter-bookmark": {
      description: "Queue message for a Twitter bookmark with video URL",
      summary: "Twitter bookmark enrichment",
      value: {
        id: 12_346,
        isTwitterBookmark: true,
        message: {
          message: {
            meta_data: {
              favIcon: "https://abs.twimg.com/favicons/twitter.3.ico",
              twitter_avatar_url: "https://pbs.twimg.com/profile_images/abc/photo.jpg",
              video_url: "https://video.twimg.com/ext_tw_video/123/pu/vid/1280x720/abc.mp4",
            },
          },
          msg_id: 43,
        },
        ogImage: "https://pbs.twimg.com/media/abc.jpg",
        queue_name: "ai-embeddings",
        url: "https://twitter.com/user/status/123456",
        user_id: "550e8400-e29b-41d4-a716-446655440000",
      },
    },
  },
  responseExample: {
    data: { message: "AI enrichment completed" },
    error: null,
  },
  security: [],
  summary: "Process AI enrichment queue message",
  tags: ["Bookmarks"],
} satisfies EndpointSupplement;
