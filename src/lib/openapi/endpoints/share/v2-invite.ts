import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2InviteSupplement = {
  additionalResponses: {
    302: {
      description: "Invite accepted — redirects to /everything",
    },
  },
  description:
    "Processes an invite token from an email link. Decodes the JWT (without verification) to extract category_id and email, then marks the invite as accepted. On success, redirects (302) to /everything. On error, returns a JSON error response. Edge cases: invalid/malformed token (400), deleted invite (500), already accepted (500), no user account (500).",
  method: "get",
  parameterExamples: {
    token: {
      "valid-invite-token": {
        description: "JWT containing category_id and email for the invite",
        summary: "Valid invite token",
        value:
          "eyJhbGciOiJIUzI1NiJ9.eyJjYXRlZ29yeV9pZCI6NDIsImVtYWlsIjoiY29sbGFiQGV4YW1wbGUuY29tIn0.abc",
      },
    },
  },
  path: "/v2/invite",
  response400Examples: {
    "invalid-token": {
      description: "Token is malformed, empty, or cannot be decoded as a JWT",
      summary: "Invalid or malformed token",
      value: {
        data: null,
        error: "Invalid token",
      } as const,
    },
  },
  responseExamples: {
    "invite-deleted": {
      description: "The invite row was removed from shared_categories before the link was clicked",
      summary: "Invite not found or deleted",
      value: {
        data: null,
        error: "Invite not found or was deleted",
      } as const,
    },
    "already-collaborator": {
      description: "The invite was already accepted — is_accept_pending is false",
      summary: "Already a collaborator",
      value: {
        data: null,
        error: "Already a collaborator",
      } as const,
    },
    "no-user-account": {
      description: "FK constraint violation — the invited email has no matching user account",
      summary: "User account not found",
      value: {
        data: null,
        error: "User account not found. Please create an account and visit this invite link again.",
      } as const,
    },
  },
  security: [],
  summary: "Accept a collaboration invite via token (redirects 302 on success)",
  tags: ["Share"],
} satisfies EndpointSupplement;
