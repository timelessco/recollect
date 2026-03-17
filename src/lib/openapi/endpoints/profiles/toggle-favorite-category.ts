/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const toggleFavoriteCategorySupplement = {
	path: "/profiles/toggle-favorite-category",
	method: "post",
	tags: ["Profiles"],
	summary: "Toggle favorite category",
	description:
		"Adds or removes a category from the user's ordered favorites list. If the category is already a favorite it is removed; otherwise it is appended. Category ID 0 represents Uncategorized. Returns the updated profile with the full favorites list.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExample: {
		category_id: 42,
	},
	responseExample: {
		data: {
			id: "550e8400-e29b-41d4-a716-446655440000",
			favorite_categories: [361, 547, 363, 7, 42],
		},
		error: null,
	},
	additionalResponses: {
		400: { description: "Invalid category ID" },
	},
} satisfies EndpointSupplement;
