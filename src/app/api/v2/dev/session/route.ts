import { env } from "@/env/server";
import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";

import { DevSessionInputSchema, DevSessionOutputSchema } from "./schema";

const ROUTE = "v2-dev-session";

/**
 * Dev-only endpoint that returns the current Supabase session token for API
 * testing via Scalar UI. Returns 404 in production.
 *
 * Uses `withAuth` because the route fundamentally requires a logged-in user —
 * its purpose is to echo the caller's session. The factory injects
 * `{ supabase, user }`; `auth.getSession()` is still called directly because
 * the route returns the raw access token, which `withAuth` does not expose
 * on `user`.
 *
 * Behavior trade-off: in production, unauthenticated callers now receive
 * 401 instead of 404. Existence of an auth-required route is not a
 * meaningful information leak, and this removes ~15 lines of duplicated
 * auth boilerplate.
 */
export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ supabase, user }) => {
      const ctx = getServerContext();

      if (env.NODE_ENV !== "development" || env.VERCEL_ENV === "production") {
        if (ctx?.fields) {
          ctx.fields.environment_blocked = true;
        }
        throw new RecollectApiError("not_found", {
          message: "Not found",
        });
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new RecollectApiError("unauthorized", {
          message: "No active session found",
        });
      }

      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
        ctx.fields.session_returned = true;
      }

      return {
        access_token: session.access_token,
        expires_at: session.expires_at,
        user_email: user.email,
      };
    },
    inputSchema: DevSessionInputSchema,
    outputSchema: DevSessionOutputSchema,
    route: ROUTE,
  }),
);
