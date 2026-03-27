import type { EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2SendEmailSupplement = {
  description:
    "Public email dispatch endpoint. Sends a collaboration invite email via Resend. This endpoint is intentionally public (legacy design preserved from v1). It is called by the send-collaboration-email endpoint, which handles authentication before delegating email delivery here. When RESEND_KEY is not configured, returns a sentinel ID instead of failing.",
  method: "post",
  path: "/v2/share/send-email",
  requestExamples: {
    "send-invite": {
      description: "Send a collaboration invite email to a single recipient",
      summary: "Send invite email",
      value: {
        category_name: "Design Inspiration",
        display_name: "Jane Doe",
        emailList: "collaborator@example.com",
        url: "https://recollect.so/api/v2/invite?token=eyJhbGciOiJIUzI1NiJ9.example",
      } as const,
    },
  },
  response400Examples: {
    "missing-fields": {
      description: "Request body is missing required fields — Zod reports the first missing field",
      summary: "Validation error - missing fields",
      value: {
        data: null,
        error: "Invalid input: expected string, received undefined",
      } as const,
    },
    "invalid-email": {
      description: "The emailList field is not a valid email address",
      summary: "Validation error - invalid email",
      value: {
        data: null,
        error: "Invalid email address",
      } as const,
    },
  },
  responseExamples: {
    "email-sent": {
      description: "Email sent successfully via Resend",
      summary: "Email sent",
      value: {
        data: { id: "re_abc123def456" },
        error: null,
      } as const,
    },
    "resend-key-missing": {
      description: "RESEND_KEY not configured (development environment) - email skipped",
      summary: "Email skipped (no API key)",
      value: {
        data: { id: "skipped-no-resend-key" },
        error: null,
      } as const,
    },
  },
  security: [],
  summary: "Send a collaboration invite email via Resend",
  tags: ["Share"],
} satisfies EndpointSupplement;
