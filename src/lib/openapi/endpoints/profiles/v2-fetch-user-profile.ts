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
    "Returns the full profile for the authenticated user. Has side effects: if `avatar` query param is provided and the user has no profile picture, updates `profile_pic` with the OAuth avatar URL. If the user has no `user_name`, auto-generates one from their email (appending a unique suffix if the name is already taken). The response includes subscription-tier metadata (`plan`, `subscription_status`, `subscription_current_period_end`) plus `freeTierCutoffAt` and `planChangedAt` — both always non-null, derived from `auth.users.created_at` when the underlying column is null. `plan` is normalized server-side to one of `free` | `pro` | `plus`; any other stored value is coerced to `free`.",
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
        "Paid user with a live subscription — all subscription fields populated. `freeTierCutoffAt` still equals signup time; `planChangedAt` reflects the upgrade.",
      summary: "Pro subscriber profile",
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
          freeTierCutoffAt: "2024-01-15T09:30:00+00:00",
          id: "550e8400-e29b-41d4-a716-446655440000",
          plan: "pro",
          planChangedAt: "2025-03-02T14:22:10+00:00",
          preferred_og_domains: ["substack.com"],
          profile_pic: "https://example.com/storage/v1/object/public/avatars/user-123.jpg",
          provider: "google",
          subscription_current_period_end: "2026-05-02T14:22:10+00:00",
          subscription_status: "active",
          user_name: "user",
        },
      ] as const,
    },
    "nullable-fields": {
      description:
        "Free-tier user with minimal data — subscription fields null, `plan` normalized to `free`. `planChangedAt` falls back to signup time because `plan_updated_at` is null.",
      summary: "Free-tier profile",
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
          freeTierCutoffAt: "2025-11-20T08:14:30+00:00",
          id: "550e8400-e29b-41d4-a716-446655440001",
          plan: "free",
          planChangedAt: "2025-11-20T08:14:30+00:00",
          preferred_og_domains: null,
          profile_pic: null,
          provider: "email",
          subscription_current_period_end: null,
          subscription_status: null,
          user_name: "another",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch authenticated user profile with auto-provisioning",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
