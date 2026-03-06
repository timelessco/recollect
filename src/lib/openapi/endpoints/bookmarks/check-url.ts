/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const checkUrlSupplement = {
	path: "/bookmarks/check-url",
	method: "get",
	tags: ["Bookmarks"],
	summary: "Check if a URL is already bookmarked",
	description:
		"Checks whether the authenticated user has already saved a given URL. Normalizes URLs before comparison (strips tracking params, trailing slashes, lowercases host). Returns the bookmark ID if found.",
	security: [{ [bearerAuth.name]: [] }, {}],
	responseExample: {
		data: { exists: true, bookmarkId: "42" },
		error: null,
	},
} satisfies EndpointSupplement;
