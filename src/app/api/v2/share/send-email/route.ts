import { createPostApiHandler } from "@/lib/api-helpers/create-handler";
import { sendInviteEmail } from "@/lib/email/send-invite-email";

import { SendEmailInputSchema, SendEmailOutputSchema } from "./schema";

// This endpoint is intentionally public (no auth) — legacy design preserved
// from v1. It serves as the email dispatch endpoint called by
// send-collaboration-email, which handles auth before delegating here.
const ROUTE = "v2-send-email";

export const POST = createPostApiHandler({
  handler: async ({ input }) => {
    const result = await sendInviteEmail({
      categoryName: input.category_name,
      displayName: input.display_name,
      inviteUrl: input.url,
      recipientEmail: input.emailList,
    });

    return { id: result.id };
  },
  inputSchema: SendEmailInputSchema,
  outputSchema: SendEmailOutputSchema,
  route: ROUTE,
});
