import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { z } from "zod";

import { createAxiomRouteHandler, withRawBody } from "@/lib/api-helpers/create-handler-v2";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { createServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/utils/error-utils/error-message";

const ROUTE = "auth-oauth";

const AuthOauthInputSchema = z.object({
  code: z.string().optional(),
  next: z.string().optional(),
});
const AuthOauthOutputSchema = z.object({});

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
        const code = searchParams.get("code");
        const rawNext = searchParams.get("next");
        const next = rawNext?.startsWith("/") ? rawNext : "/";

        if (ctx?.fields) {
          ctx.fields.has_code = Boolean(code);
          ctx.fields.has_next = Boolean(rawNext);
        }

        if (!code) {
          if (ctx?.fields) {
            ctx.fields.error_code = "bad_request";
            ctx.fields.error_message = "No code";
            ctx.fields.http_status = 400;
            ctx.fields.operation = "exchange_code_for_session";
          }
          return errorRedirect(request, "No code");
        }

        const supabase = await createServerClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          const message = getErrorMessage(exchangeError);
          if (ctx?.fields) {
            ctx.fields.error_code = "unauthorized";
            ctx.fields.error_message = message;
            ctx.fields.http_status = 401;
            ctx.fields.operation = "exchange_code_for_session";
            ctx.fields.exchange_code_completed = false;
          }
          return errorRedirect(request, message);
        }

        if (ctx?.fields) {
          ctx.fields.exchange_code_completed = true;
        }

        // Route first-time users to /discover so the welcome modal mounts
        // via [category_id].tsx's SSR gate. Helper fails open to `next`.
        // exchangeCodeForSession just succeeded, so getUser should return a
        // fresh user — but record the error path explicitly so a silent
        // fallback to `next` is observable in Axiom.
        const { data: getUserData, error: getUserError } = await supabase.auth.getUser();
        const user = getUserData?.user;

        let destination = next;
        if (getUserError || !user?.id) {
          if (ctx?.fields) {
            ctx.fields.get_user_after_exchange_failed = true;
            if (getUserError) {
              ctx.fields.get_user_error_message = getUserError.message;
            }
          }
        } else {
          destination = await resolvePostLoginRedirect(supabase, user.id, next);
        }

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
          ctx.fields.operation = "exchange_code_for_session";
        }
        return errorRedirect(request, "An unexpected error occurred");
      }
    },
    inputSchema: AuthOauthInputSchema,
    outputSchema: AuthOauthOutputSchema,
    route: ROUTE,
  }),
);
