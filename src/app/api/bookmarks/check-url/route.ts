import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { normalizeUrl } from "@/utils/url-normalize";

import { CheckUrlInputSchema, CheckUrlOutputSchema } from "./schema";

const ROUTE = "bookmarks-check-url";

/**
 * @deprecated Use /api/v2/bookmarks/check-url instead. Retained for iOS and extension clients.
 */
export const GET = createGetApiHandlerWithAuth({
  handler: async ({ data, route, supabase, user }) => {
    console.log(`[${route}] API called:`, { url: data.url, userId: user.id });

    const normalized = normalizeUrl(data.url);

    if (!normalized) {
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
      return apiError({
        error,
        message: "Failed to check bookmark",
        operation: "check_url",
        route,
        userId: user.id,
      });
    }

    const match = candidates?.find((row) => normalizeUrl(row.url) === normalized);

    if (match) {
      return { bookmarkId: String(match.id), exists: true as const };
    }

    return { exists: false as const };
  },
  inputSchema: CheckUrlInputSchema,
  outputSchema: CheckUrlOutputSchema,
  route: ROUTE,
});
