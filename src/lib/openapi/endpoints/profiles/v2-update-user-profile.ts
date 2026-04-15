import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2UpdateUserProfileSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    404: { description: "Profile not found" },
  },
  description:
    "Updates one or more profile fields for the authenticated user. Accepts a partial `updateData` object — at least one field must be provided. Returns the full updated profile row.",
  method: "patch",
  path: "/v2/profiles/update-user-profile",
  requestExamples: {
    "update-display-name": {
      description: "Update only the display name field.",
      summary: "Update display name",
      value: { updateData: { display_name: "Jane Smith" } },
    },
    "update-multiple-fields": {
      description: "Update display name and provider at the same time.",
      summary: "Update multiple fields",
      value: {
        updateData: { display_name: "Jane Smith", provider: "google" },
      },
    },
  },
  response400Examples: {
    "empty-update-data": {
      description:
        "Sending an empty `updateData: {}` fails the refine check — at least one field must be provided.",
      summary: "Empty updateData object",
      value: {
        error: "Invalid request body",
      } as const,
    },
    "missing-update-data": {
      description: "The top-level `updateData` key was omitted from the request body.",
      summary: "Missing updateData field",
      value: {
        error: "Invalid request body",
      } as const,
    },
  },
  responseExamples: {
    "profile-updated": {
      description: "Full profile row returned after update — all columns included.",
      summary: "Profile updated successfully",
      value: [
        {
          ai_features_toggle: {
            ai_summary: true,
            auto_assign_collections: true,
            image_keywords: true,
            ocr: true,
          },
          api_key: null,
          bookmark_count: 42,
          bookmarks_view: null,
          category_order: [577, 724],
          display_name: "Jane Smith",
          email: "jane@example.com",
          id: "550e8400-e29b-41d4-a716-446655440000",
          preferred_og_domains: ["substack.com"],
          profile_pic: null,
          provider: "google",
          user_name: "janesmith",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Update authenticated user's profile fields",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
