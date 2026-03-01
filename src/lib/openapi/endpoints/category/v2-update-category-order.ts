/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2UpdateCategoryOrderSupplement = {
	path: "/v2/category/update-category-order",
	method: "patch",
	tags: ["Categories"],
	summary: "Update category display order",
	description:
		"Sets the ordered list of category IDs for the authenticated user's profile. Controls the display order of collections in the UI. A null input is coalesced to an empty array, effectively clearing the order. Returns the updated profile row with `id` and `category_order`.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"reorder-categories": {
			summary: "Reorder categories",
			description:
				"Send an array of category IDs in the desired display order.",
			value: {
				category_order: [724, 577, 812],
			},
		},
		"clear-order": {
			summary: "Clear category order",
			description: "Send null to reset the category order to an empty array.",
			value: {
				category_order: null,
			},
		},
		"empty-order": {
			summary: "Empty order array",
			description: "Send an empty array to clear all ordering.",
			value: {
				category_order: [],
			},
		},
	},
	responseExamples: {
		"order-updated": {
			summary: "Category order updated",
			description:
				"Returns the updated profile row with the new category_order array.",
			value: {
				data: [
					{
						category_order: [724, 577, 812],
						id: "550e8400-e29b-41d4-a716-446655440000",
					},
				],
				error: null,
			} as const,
		},
		"order-cleared": {
			summary: "Category order cleared",
			description:
				"Null input coalesces to empty array — category_order is stored as an empty array.",
			value: {
				data: [
					{
						category_order: [],
						id: "550e8400-e29b-41d4-a716-446655440000",
					},
				],
				error: null,
			} as const,
		},
	},
	additionalResponses: {
		401: { description: "Not authenticated" },
	},
} satisfies EndpointSupplement;
