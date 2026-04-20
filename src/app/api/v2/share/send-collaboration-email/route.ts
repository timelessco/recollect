import jwt from "jsonwebtoken";

import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { sendInviteEmail } from "@/lib/email/send-invite-email";
import { CATEGORIES_TABLE_NAME, SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import { SendCollaborationEmailInputSchema, SendCollaborationEmailOutputSchema } from "./schema";

const ROUTE = "v2-send-collaboration-email";

export const POST = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data: input, supabase, user }) => {
      const [emailAddress] = input.emailList;

      // Entity IDs + input context BEFORE operations (PII fix D-10: boolean signal, not raw email)
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.category_id = input.category_id;
      }
      setPayload(ctx, { has_collaboration_email: Boolean(emailAddress) });

      // Check for existing share (retry-safe: duplicate returns 409)
      const { data: existingRow, error: checkError } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .select("*")
        .eq("category_id", input.category_id)
        .eq("email", emailAddress)
        .maybeSingle();

      if (checkError) {
        throw new RecollectApiError("service_unavailable", {
          cause: checkError,
          message: "Error checking existing collaboration",
          operation: "check_existing_collaboration",
        });
      }

      if (existingRow) {
        throw new RecollectApiError("conflict", {
          message: "Email already exists",
          operation: "check_existing_collaboration",
        });
      }

      // Insert-then-send: if email fails, pending row remains (retry-safe via duplicate check above)
      const { error: insertError } = await supabase.from(SHARED_CATEGORIES_TABLE_NAME).insert({
        category_id: input.category_id,
        edit_access: input.edit_access,
        email: emailAddress,
        is_accept_pending: true,
        user_id: user.id,
      });

      if (insertError) {
        throw new RecollectApiError("service_unavailable", {
          cause: insertError,
          message: "Error inserting collaboration row",
          operation: "insert_collaboration",
        });
      }

      const token = jwt.sign(
        {
          category_id: input.category_id,
          edit_access: input.edit_access,
          email: emailAddress,
          userId: user.id,
        },
        "shhhhh",
      );
      // Uses v1 invite URL — Phase 13 caller migration updates to /api/v2/invite
      const inviteUrl = `${input.hostUrl}/api/invite?token=${token}`;

      // Fetch category + owner profile for email template
      const { data: categoryData } = await supabase
        .from(CATEGORIES_TABLE_NAME)
        .select("*, profiles:user_id (id, user_name, display_name, email)")
        .eq("id", input.category_id)
        .single();

      const profile = categoryData?.profiles;
      const displayName = profile?.display_name ?? profile?.user_name ?? "A user";
      const categoryName = categoryData?.category_name ?? "Untitled";

      // sendInviteEmail handles RESEND_KEY guard internally — no dev-mode skip needed in route
      try {
        await sendInviteEmail({
          categoryName,
          displayName,
          inviteUrl,
          recipientEmail: emailAddress,
        });
      } catch (emailError) {
        throw new RecollectApiError("service_unavailable", {
          cause: emailError,
          message: "Error sending email",
          operation: "send_collaboration_email",
        });
      }

      // Outcome flags AFTER operations
      setPayload(ctx, { collaboration_sent: true });

      return { url: inviteUrl };
    },
    inputSchema: SendCollaborationEmailInputSchema,
    outputSchema: SendCollaborationEmailOutputSchema,
    route: ROUTE,
  }),
);
