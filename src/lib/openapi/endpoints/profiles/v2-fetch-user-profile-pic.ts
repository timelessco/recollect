import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2FetchUserProfilePicSupplement = {
  additionalResponses: {
    400: { description: "Missing or invalid email query parameter" },
  },
  description:
    "Returns the profile picture URL for the user with the given email address. The profile_pic field is null when no picture has been set.",
  method: "get",
  parameterExamples: {
    email: {
      "no-match": {
        description: "Returns empty array.",
        summary: "Nonexistent email",
        value: "nobody@example.com",
      },
      "no-profile-pic": {
        description: "Returns profile_pic: null.",
        summary: "User without avatar",
        value: "another@example.com",
      },
      "with-profile-pic": {
        description: "Returns profile_pic URL.",
        summary: "User with avatar",
        value: "user@example.com",
      },
    },
  },
  path: "/v2/profiles/fetch-user-profile-pic",
  response400Examples: {
    "missing-email": {
      description: "Omit the `email` query parameter entirely — returns 400.",
      summary: "Missing email parameter",
      value: {
        error: "email: Required",
      } as const,
    },
  },
  responseExamples: {
    "no-match": {
      description:
        "Send `?email=nobody@example.com` — returns empty array when no profile matches.",
      summary: "No user found for email",
      value: [] as const,
    },
    "no-profile-pic": {
      description:
        "Send `?email=user@example.com` where the user has no avatar — `profile_pic` is null.",
      summary: "User has no profile picture",
      value: [
        {
          profile_pic: null,
        },
      ] as const,
    },
    "with-profile-pic": {
      description: "Send `?email=user@example.com` where the user has an uploaded avatar.",
      summary: "User has a profile picture",
      value: [
        {
          profile_pic: "https://example.com/storage/v1/object/public/avatars/user-123.jpg",
        },
      ] as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Fetch profile picture for a user by email",
  tags: ["Profiles"],
} satisfies EndpointSupplement;
