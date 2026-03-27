import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2DeleteUserSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
  },
  description:
    "Permanently deletes the authenticated user's account and all associated data. Cascades across bookmark_tags, bookmarks, tags, shared_categories, bookmark_categories, categories, and profiles tables. Also deletes R2 storage (OG images, screenshots, files, profile pictures) and removes the user from Supabase auth via admin API. This action is irreversible.",
  method: "post",
  path: "/v2/profiles/delete-user",
  requestExamples: {
    "empty-body": {
      description: "No body fields are required — user identity comes from the auth context.",
      summary: "Empty request body",
      value: {},
    },
  },
  responseExamples: {
    "user-deleted": {
      description:
        "Returns null for the user field, confirming the account has been permanently deleted.",
      summary: "User successfully deleted",
      value: {
        data: { user: null },
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Permanently delete authenticated user's account and all data",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
