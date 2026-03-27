import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { decode } from "jsonwebtoken";

import { createGetApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";
import { createServerServiceClient } from "@/lib/supabase/service";
import { isNullable } from "@/utils/assertion-utils";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import { InviteInputSchema, InviteOutputSchema } from "./schema";

const ROUTE = "v2-invite";

export const GET = createGetApiHandler({
  handler: async ({ input, route }) => {
    // Service client bypasses RLS — required for invite processing regardless of user auth
    const supabase = createServerServiceClient();

    const decoded = decode(input.token);

    if (isNullable(decoded) || typeof decoded === "string") {
      return apiWarn({
        context: { token: "[redacted]" },
        message: "Invalid token",
        route,
        status: 400,
      });
    }

    // decoded is JwtPayload with [key: string]: any — extract and validate fields
    const categoryId = Number(decoded.category_id);
    const email = String(decoded.email ?? "");

    if (Number.isNaN(categoryId) || email === "") {
      return apiWarn({
        context: { token: "[redacted]" },
        message: "Invalid token",
        route,
        status: 400,
      });
    }

    // Check if invite exists in shared_categories
    const { data, error } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .select("*")
      .eq("category_id", categoryId)
      .eq("email", email);

    // If data is empty and no error, the invite was deleted
    if (isNullable(error) && (isNullable(data) || data.length === 0)) {
      return apiError({
        error: new Error("Invite row missing from shared_categories"),
        extra: { categoryId, email },
        message: "Invite not found or was deleted",
        operation: "check_invite",
        route,
      });
    }

    if (error) {
      return apiError({
        error,
        extra: { categoryId, email },
        message: "Failed to look up invite",
        operation: "check_invite",
        route,
      });
    }

    // At this point data is non-null and non-empty
    const [invite] = data;

    if (invite.is_accept_pending !== true) {
      return apiError({
        error: new Error("Invite already accepted"),
        extra: { categoryId, email },
        message: "Already a collaborator",
        operation: "check_invite_status",
        route,
      });
    }

    // Accept the invite — mark as no longer pending
    const { error: updateError } = await supabase
      .from(SHARED_CATEGORIES_TABLE_NAME)
      .update({ is_accept_pending: false })
      .eq("email", email)
      .eq("category_id", categoryId);

    if (updateError) {
      if (updateError.code === "23503") {
        return apiError({
          error: updateError,
          extra: { categoryId, email },
          message:
            "User account not found. Please create an account and visit this invite link again.",
          operation: "accept_invite_fk",
          route,
        });
      }

      return apiError({
        error: updateError,
        extra: { categoryId, email },
        message: "Failed to accept invite",
        operation: "accept_invite",
        route,
      });
    }

    // Redirect to /everything on success — pin 302 explicitly
    const headersList = await headers();
    const host = headersList.get("host") ?? "localhost:3000";
    const protocol = headersList.get("x-forwarded-proto") ?? "https";
    return NextResponse.redirect(new URL("/everything", `${protocol}://${host}`), 302);
  },
  inputSchema: InviteInputSchema,
  outputSchema: InviteOutputSchema,
  route: ROUTE,
});
