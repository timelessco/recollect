import * as Sentry from "@sentry/nextjs";
import jwt from "jsonwebtoken";

import { createPostApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { sendInviteEmail } from "@/lib/email/send-invite-email";
import { CATEGORIES_TABLE_NAME, SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import { SendCollaborationEmailInputSchema, SendCollaborationEmailOutputSchema } from "./schema";

const ROUTE = "v2-send-collaboration-email";

export const POST = createPostApiHandlerWithAuth({
  handler: async ({ data: input, supabase, user }) => {
    const [emailAddress] = input.emailList;

    // Check for existing share (retry-safe: duplicate returns 409)
    const { data: existingRow, error: checkError } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .select("*")
      .eq("category_id", input.category_id)
      .eq("email", emailAddress)
      .maybeSingle();

    if (checkError) {
      return apiError({
        error: checkError,
        message: "Error checking existing collaboration",
        operation: "check_existing_collaboration",
        route: ROUTE,
        userId: user.id,
      });
    }

    if (existingRow) {
      return apiWarn({
        message: "Email already exists",
        route: ROUTE,
        status: 409,
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
      return apiError({
        error: insertError,
        message: "Error inserting collaboration row",
        operation: "insert_collaboration",
        route: ROUTE,
        userId: user.id,
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
      Sentry.captureException(emailError, {
        extra: { categoryId: input.category_id, email: emailAddress },
        tags: { operation: "send_collaboration_email", route: ROUTE, userId: user.id },
      });
      return apiError({
        error: emailError,
        message: "Error sending email",
        operation: "send_collaboration_email",
        route: ROUTE,
        userId: user.id,
      });
    }

    return { url: inviteUrl };
  },
  inputSchema: SendCollaborationEmailInputSchema,
  outputSchema: SendCollaborationEmailOutputSchema,
  route: ROUTE,
});
