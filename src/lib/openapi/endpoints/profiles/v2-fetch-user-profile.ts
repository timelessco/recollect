import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchUserProfileSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Returns the full profile for the authenticated user. Has side effects: if `avatar` query param is provided and the user has no profile picture, updates `profile_pic` with the OAuth avatar URL. If the user has no `user_name`, auto-generates one from their email (appending a unique suffix if the name is already taken).",
  method: "get",
  parameterExamples: {
    avatar: {
      "no-avatar": {
        description: "Omit `avatar` — returns the profile without triggering a profile_pic update.",
        summary: "No avatar param",
        value: "",
      },
      "with-avatar-sync": {
        description: "Pass an OAuth avatar URL — updates `profile_pic` if the user has none set.",
        summary: "Sync OAuth avatar",
        value: "https://example.com/avatars/user-123.jpg",
      },
    },
  },
  path: "/v2/profiles/fetch-user-profile",
  responseExamples: {
    "full-profile": {
      description:
        "Call without `avatar` param — returns all profile fields for the authenticated user.",
      summary: "Fully populated profile",
      value: [
        {
          ai_features_toggle: {
            ai_summary: true,
            auto_assign_collections: true,
            image_keywords: true,
            ocr: true,
          },
          api_key: null,
          bookmark_count: 0,
          bookmarks_view: {
            everything: {
              bookmarksView: "moodboard",
              cardContentViewArray: ["cover", "title", "tags", "info", "description"],
              moodboardColumns: [50],
              sortBy: "date-sort-ascending",
            },
          },
          category_order: [577, 724],
          display_name: "User",
          email: "user@example.com",
          id: "550e8400-e29b-41d4-a716-446655440000",
          preferred_og_domains: ["substack.com"],
          profile_pic: "https://example.com/storage/v1/object/public/avatars/user-123.jpg",
          provider: "google",
          user_name: "user",
        },
      ] as const,
    },
    "nullable-fields": {
      description: "User with minimal data — nullable fields return null or empty arrays.",
      summary: "Profile with nullable fields",
      value: [
        {
          ai_features_toggle: {
            ai_summary: true,
            auto_assign_collections: true,
            image_keywords: true,
            ocr: true,
          },
          api_key: null,
          bookmark_count: 0,
          bookmarks_view: null,
          category_order: null,
          display_name: null,
          email: "another@example.com",
          id: "550e8400-e29b-41d4-a716-446655440001",
          preferred_og_domains: null,
          profile_pic: null,
          provider: "email",
          user_name: "another",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch authenticated user profile with auto-provisioning",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
