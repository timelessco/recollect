import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";

export const v2SendCollaborationEmailSupplement = {
  additionalResponses: {
    401: { description: "Not authenticated" },
    409: { description: "Collaborator already exists for this category" },
  },
  description:
    "Sends a collaboration invite email for a category. Inserts a pending shared_categories row, signs a JWT invite token, and calls sendInviteEmail() directly (no HTTP loopback). If the email send fails after the DB insert, the pending row remains — this is intentional and retry-safe via the duplicate check. The invite URL uses the v1 path `/api/invite` (Phase 13 migrates callers). When RESEND_KEY is not configured (dev), the email is silently skipped but the invite URL is still returned.",
  method: "post",
  path: "/v2/share/send-collaboration-email",
  responseExamples: {
    "invite-sent": {
      description: "Collaboration invite sent. The invite URL is always returned.",
      summary: "Invite email sent",
      value: {
        data: { url: "https://recollect.so/api/invite?token=eyJhbGciOiJIUzI1NiJ9.example" },
        error: null,
      } as const,
    },
  },
  security: [{ [bearerAuth.name]: [] }, {}],
  summary: "Send collaboration invite email for a category",
  tags: ["Share"],
} satisfies EndpointSupplement;
