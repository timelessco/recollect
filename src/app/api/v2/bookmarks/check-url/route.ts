import { createAxiomRouteHandler, withAuth } from "@/lib/api-helpers/create-handler-v2";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { getServerContext, setPayload } from "@/lib/api-helpers/server-context";
import { normalizeUrl } from "@/utils/url-normalize";

import { CheckUrlInputSchema, CheckUrlOutputSchema } from "./schema";

const ROUTE = "v2-bookmarks-check-url";

export const GET = createAxiomRouteHandler(
  withAuth({
    handler: async ({ data, supabase, user }) => {
      const ctx = getServerContext();
      if (ctx?.fields) {
        ctx.fields.user_id = user.id;
      }

      const normalized = normalizeUrl(data.url);

      if (!normalized) {
        setPayload(ctx, {
          url_normalized: false,
          exists: false,
        });
        return { exists: false as const };
      }

      const baseUrl = new URL(normalized);
      const basePath = `${baseUrl.protocol}//${baseUrl.host}${baseUrl.pathname}`;
      const escapedBase = basePath.replaceAll("%", "\\%").replaceAll("_", "\\_");

      const { data: candidates, error } = await supabase
        .from("everything")
        .select("id, url")
        .eq("user_id", user.id)
        .is("trash", null)
        .like("url", `${escapedBase}%`)
        .limit(50);

      if (error) {
        throw new RecollectApiError("service_unavailable", {
          cause: error,
          message: "Failed to check bookmark",
          operation: "check_url",
        });
      }

      setPayload(ctx, { candidate_count: candidates.length });

      const match = candidates.find((row) => normalizeUrl(row.url) === normalized);

      if (match) {
        if (ctx?.fields) {
          ctx.fields.bookmark_id = String(match.id);
        }
        setPayload(ctx, { exists: true });
        return { bookmarkId: String(match.id), exists: true as const };
      }

      setPayload(ctx, { exists: false });
      return { exists: false as const };
    },
    inputSchema: CheckUrlInputSchema,
    outputSchema: CheckUrlOutputSchema,
    route: ROUTE,
  }),
);
