import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { z } from "zod";

import type { EmailOtpType } from "@supabase/supabase-js";

import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { createServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/utils/error-utils/error-message";

const ROUTE = "auth-confirm";

const EMAIL_OTP_TYPES = new Set<string>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

function isEmailOtpType(value: string): value is EmailOtpType {
  return EMAIL_OTP_TYPES.has(value);
}

// Schemas required by the withRawBody factory signature. These routes are not
// crawled by the OpenAPI scanner (not under /api/v2/), so field descriptions
// are omitted and output is an empty object (handler always returns NextResponse).
const AuthConfirmInputSchema = z.object({
  token_hash: z.string().optional(),
  type: z.string().optional(),
  next: z.string().optional(),
});
const AuthConfirmOutputSchema = z.object({});

function errorRedirect(request: NextRequest, message: string): NextResponse {
  const url = new URL("/auth/error", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

function successRedirect(request: NextRequest, next: string): NextResponse {
  return NextResponse.redirect(new URL(next, request.url));
}

export const GET = createAxiomRouteHandler(
  withRawBody({
    handler: async ({ request }): Promise<NextResponse> => {
      const ctx = getServerContext();

      try {
        const { searchParams } = request.nextUrl;
        const tokenHash = searchParams.get("token_hash");
        const rawType = searchParams.get("type");
        const rawNext = searchParams.get("next");
        const type: EmailOtpType | null =
          rawType !== null && isEmailOtpType(rawType) ? rawType : null;
        const next = rawNext?.startsWith("/") ? rawNext : "/";

        if (ctx?.fields) {
          ctx.fields.has_token_hash = Boolean(tokenHash);
          ctx.fields.has_type = Boolean(rawType);
          ctx.fields.has_next = Boolean(rawNext);
          if (type !== null) {
            ctx.fields.otp_type = type;
          }
        }

        if (!tokenHash || !type) {
          if (ctx?.fields) {
            ctx.fields.error_code = "bad_request";
            ctx.fields.error_message = "No token hash or type";
            ctx.fields.http_status = 400;
            ctx.fields.operation = "verify_otp";
          }
          return errorRedirect(request, "No token hash or type");
        }

        const supabase = await createServerClient();
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });

        if (verifyError) {
          const message = getErrorMessage(verifyError);
          if (ctx?.fields) {
            ctx.fields.error_code = "unauthorized";
            ctx.fields.error_message = message;
            ctx.fields.http_status = 401;
            ctx.fields.operation = "verify_otp";
            ctx.fields.verify_otp_completed = false;
          }
          return errorRedirect(request, message);
        }

        if (ctx?.fields) {
          ctx.fields.verify_otp_completed = true;
        }

        // Route first-time users to /discover so the welcome modal mounts
        // via [category_id].tsx's SSR gate. Helper fails open to `next`.
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const destination = user ? await resolvePostLoginRedirect(supabase, user.id, next) : next;

        if (ctx?.fields) {
          ctx.fields.first_time_user_redirect = destination !== next;
        }

        return successRedirect(request, destination);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (ctx?.fields) {
          ctx.fields.error_code = "internal_error";
          ctx.fields.error_name = err.name;
          ctx.fields.error_message = err.message;
          ctx.fields.error_stack = err.stack;
          ctx.fields.http_status = 500;
          ctx.fields.operation = "verify_otp";
        }
        return errorRedirect(request, "An unexpected error occurred");
      }
    },
    inputSchema: AuthConfirmInputSchema,
    outputSchema: AuthConfirmOutputSchema,
    route: ROUTE,
  }),
);
