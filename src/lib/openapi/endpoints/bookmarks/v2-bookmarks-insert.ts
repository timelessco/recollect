/**
 * @module Build-time only
 */
import { bearerAuth } from "@/lib/openapi/registry";
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";

export const v2BookmarksInsertSupplement = {
	path: "/v2/bookmarks/insert",
	method: "post",
	tags: ["Bookmarks"],
	summary: "Batch insert bookmarks for the authenticated user",
	description:
		"Accepts an array of bookmark objects and inserts them with the authenticated user's ID. Used by the Chrome extension for bulk bookmark import. Returns the count of successfully inserted bookmarks.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"single-bookmark": {
			summary: "Insert one bookmark",
			description: "Minimal payload with a single bookmark.",
			value: {
				data: [
					{
						title: "Example Site",
						url: "https://example.com",
						description: null,
						ogImage: null,
						type: null,
					},
				],
			} as const,
		},
		"multiple-bookmarks": {
			summary: "Insert multiple bookmarks",
			description: "Batch insert with two bookmarks including metadata.",
			value: {
				data: [
					{
						title: "GitHub",
						url: "https://github.com",
						description: "Where the world builds software",
						ogImage:
							"https://github.githubassets.com/images/modules/site/social-cards/github-social.png",
						type: "link",
					},
					{
						title: "MDN Web Docs",
						url: "https://developer.mozilla.org",
						description: "Resources for developers, by developers",
						ogImage: null,
						type: "link",
					},
				],
			} as const,
		},
	},
	responseExamples: {
		"single-insert": {
			summary: "One bookmark inserted",
			description: "Successfully inserted a single bookmark.",
			value: {
				data: { insertedCount: 1 },
				error: null,
			} as const,
		},
		"batch-insert": {
			summary: "Multiple bookmarks inserted",
			description: "Successfully inserted two bookmarks in a batch.",
			value: {
				data: { insertedCount: 2 },
				error: null,
			} as const,
		},
	},
	response400Examples: {
		"empty-array": {
			summary: "Empty bookmarks array",
			description: "Fails when the data array has no elements.",
			value: {
				data: null,
				error: "data: Array must contain at least 1 element(s)",
			} as const,
		},
		"missing-url": {
			summary: "Missing required URL field",
			description: "Fails when a bookmark object is missing the url field.",
			value: {
				data: null,
				error: "data[0].url: Required",
			} as const,
		},
	},
	additionalResponses: {
		400: { description: "Invalid request body or empty bookmarks array" },
	},
} satisfies EndpointSupplement;
