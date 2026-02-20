import { createGetApiHandlerWithAuth } from "@/lib/api-helpers/create-handler";
import { apiError } from "@/lib/api-helpers/response";
import { normalizeUrl } from "@/utils/url-normalize";
import { CheckUrlInputSchema, CheckUrlOutputSchema } from "./schema";

const ROUTE = "bookmarks-check-url";

export const GET = createGetApiHandlerWithAuth({
	route: ROUTE,
	inputSchema: CheckUrlInputSchema,
	outputSchema: CheckUrlOutputSchema,
	handler: async ({ data, supabase, user, route }) => {
		console.log(`[${route}] API called:`, { userId: user.id, url: data.url });

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
			.like("url", `${escapedBase}%`)
			.limit(50);

		if (error) {
			return apiError({
				route,
				message: "Failed to check bookmark",
				error,
				operation: "check_url",
				userId: user.id,
			});
		}

		const match = candidates?.find(
			(row) => normalizeUrl(row.url) === normalized,
		);

		if (match) {
			return { exists: true as const, bookmarkId: String(match.id) };
		}

		return { exists: false as const };
	},
});
