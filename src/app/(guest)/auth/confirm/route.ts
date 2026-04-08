import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import * as Sentry from "@sentry/nextjs";

import type { EmailOtpType } from "@supabase/supabase-js";

import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";
import { createServerClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/utils/error-utils/error-message";

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const rawType = searchParams.get("type");
    const type = rawType !== null && isEmailOtpType(rawType) ? rawType : null;
    // if "next" is in param, use it as the redirect URL
    const _next = searchParams.get("next");
    const next = _next?.startsWith("/") ? _next : "/";

    if (token_hash && type) {
      const supabase = await createServerClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });

      if (error) {
        // redirect the user to an error page with some instructions
        redirect(`/auth/error?error=${getErrorMessage(error)}`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const destination = user ? await resolvePostLoginRedirect(supabase, user.id, next) : next;

      redirect(destination);
    }

    // redirect the user to an error page with some instructions
    redirect(`/auth/error?error=No token hash or type`);
  } catch (error) {
    console.error("Error in auth confirm route:", error);
    Sentry.captureException(error, {
      extra: {
        url: request.url,
      },
      tags: {
        operation: "verify_otp",
      },
    });
    redirect(`/auth/error?error=An unexpected error occurred`);
  }
}
