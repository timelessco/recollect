import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

import { SendEmailInputSchema, SendEmailOutputSchema } from "./schema";

// This endpoint is intentionally public (no auth) — legacy design preserved
// from v1. It serves as the email dispatch endpoint called by
// send-collaboration-email, which handles auth before delegating here.
const ROUTE = "v2-send-email";

export const POST = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.recipient_count = 1;
      }

      const result = await sendInviteEmail({
        categoryName: input.category_name,
        displayName: input.display_name,
        inviteUrl: input.url,
        recipientEmail: input.emailList,
      });

      if (ctx?.fields) {
        ctx.fields.email_sent = true;
      }

      return { id: result.id };
    },
    inputSchema: SendEmailInputSchema,
    outputSchema: SendEmailOutputSchema,
    route: ROUTE,
  }),
);
