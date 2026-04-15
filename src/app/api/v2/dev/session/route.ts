import { env } from "@/env/server";
import { createAxiomRouteHandler, withPublic } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext } from "@/lib/api-helpers/server-context";
import { createApiClient, getApiUser } from "@/lib/supabase/api";

import { DevSessionInputSchema, DevSessionOutputSchema } from "./schema";

const ROUTE = "v2-dev-session";

/**
 * Dev-only endpoint that returns the current Supabase session token for API
 * testing. Must be accessed via browser — relies on session cookies, not
 * bearer tokens. Returns 404 in production.
 *
 * Uses `withPublic` + manual `createApiClient()` because the route is meant
 * to read the browser's Supabase auth cookie rather than a validated bearer
 * token. `withAuth` would reject the cookie-only request before the handler
 * runs.
 */
export const GET = createAxiomRouteHandler(
  withPublic({
    handler: async () => {
      const ctx = getServerContext();

      if (env.NODE_ENV !== "development" || env.VERCEL_ENV === "production") {
        if (ctx?.fields) {
          ctx.fields.environment_blocked = true;
        }
        throw new RecollectApiError("not_found", {
          message: "Not found",
        });
      }

      const { supabase, token } = await createApiClient();

      const {
        data: { user },
        error: userError,
      } = await getApiUser(supabase, token);

      if (userError) {
        throw new RecollectApiError("unauthorized", {
          cause: userError,
          message: userError.message,
          operation: "dev_session_get_user",
        });
      }

      if (!user) {
        throw new RecollectApiError("unauthorized", {
          message: "No active session found",
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
