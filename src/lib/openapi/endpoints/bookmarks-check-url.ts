/**
 * @module Build-time only
 */
import {
	CheckUrlInputSchema,
	CheckUrlOutputSchema,
} from "@/app/api/bookmarks/check-url/schema";
import { bearerAuth, registry } from "@/lib/openapi/registry";
import { apiResponseSchema } from "@/lib/openapi/schemas/envelope";

export function registerBookmarksCheckUrl() {
	registry.registerPath({
		method: "get",
		path: "/bookmarks/check-url",
		tags: ["Bookmarks"],
		summary: "Check if a URL is already bookmarked",
		description:
			"Checks whether the authenticated user has already saved a given URL. Normalizes URLs before comparison (strips tracking params, trailing slashes, lowercases host). Returns the bookmark ID if found.",
		security: [{ [bearerAuth.name]: [] }, {}],
		request: {
			query: CheckUrlInputSchema,
		},
		responses: {
			200: {
				description: "URL check result",
				content: {
					"application/json": {
						schema: apiResponseSchema(CheckUrlOutputSchema),
						example: {
							data: { exists: true, bookmarkId: "42" },
							error: null,
						},
					},
				},
			},
			401: { $ref: "#/components/responses/Unauthorized" },
			500: { $ref: "#/components/responses/InternalError" },
		},
	});
}
