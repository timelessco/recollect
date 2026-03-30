import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { decode } from "jsonwebtoken";

import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createServerServiceClient } from "@/lib/supabase/service";
import { isNullable } from "@/utils/assertion-utils";
import { SHARED_CATEGORIES_TABLE_NAME } from "@/utils/constants";

import { InviteInputSchema, InviteOutputSchema } from "./schema";

const ROUTE = "v2-invite";

export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async ({ input }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.invite_token_present = true;
      }

      // Service client bypasses RLS — required for invite processing regardless of user auth
      const supabase = createServerServiceClient();

      const decoded = decode(input.token);

      if (isNullable(decoded) || typeof decoded === "string") {
        throw new RecollectApiError("bad_request", {
          message: "Invalid token",
        });
      }

      // decoded is JwtPayload with [key: string]: any — extract and validate fields
      const categoryId = Number(decoded.category_id);
      const email = String(decoded.email ?? "");

      if (Number.isNaN(categoryId) || email === "") {
        throw new RecollectApiError("bad_request", {
          message: "Invalid token",
        });
      }

      if (ctx?.fields) {
        ctx.fields.invite_category_id = categoryId;
      }

      // Check if invite exists in shared_categories
      const { data, error } = await supabase
        .from(SHARED_CATEGORIES_TABLE_NAME)
        .select("*")
        .eq("category_id", categoryId)
        .eq("email", email);

      // If data is empty and no error, the invite was deleted
      if (isNullable(error) && (isNullable(data) || data.length === 0)) {
        throw new RecollectApiError("not_found", {
          message: "Invite not found or was deleted",
          operation: "check_invite",
        });
      }

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to look up invite",
          operation: "check_invite",
        });
      }

      // At this point data is non-null and non-empty
      const [invite] = data;

      if (invite.is_accept_pending !== true) {
        throw new RecollectApiError("conflict", {
          message: "Already a collaborator",
          operation: "check_invite_status",
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
          throw new RecollectApiError("service_unavailable", {
            cause: updateError,
            message:
              "User account not found. Please create an account and visit this invite link again.",
            operation: "accept_invite_fk",
          });
        }

        throw new RecollectApiError("service_unavailable", {
          cause: updateError,
          message: "Failed to accept invite",
          operation: "accept_invite",
        });
      }

      // Redirect to /everything on success — pin 302 explicitly
      // Query param triggers a welcome toast on the dashboard
      const headersList = await headers();
      const host = headersList.get("host") ?? "localhost:3000";
      const protocol = headersList.get("x-forwarded-proto") ?? "https";
      return NextResponse.redirect(
        new URL("/everything?invite=accepted", `${protocol}://${host}`),
        302,
      );
    },
    inputSchema: InviteInputSchema,
    outputSchema: InviteOutputSchema,
    route: ROUTE,
  }),
);
