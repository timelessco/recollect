/**
 * @module Build-time only
 */
import { type EndpointSupplement } from "@/lib/openapi/supplement-types";
import { bearerAuth } from "@/lib/openapi/registry";

export const twitterSyncFoldersSupplement = {
	path: "/twitter/sync-folders",
	method: "post",
	tags: ["Twitter"],
	summary: "Sync Twitter bookmark folders as collections",
	description:
		"Creates Recollect collections from Twitter/X bookmark folder names. Deduplicates by case-insensitive name match against existing collections. Returns counts of created and skipped collections.",
	security: [{ [bearerAuth.name]: [] }, {}],
	requestExamples: {
		"single-category": {
			summary: "Create one folder",
			description:
				"Sync a single Twitter bookmark folder as a Recollect collection.",
			value: {
				categories: [{ name: "Tech Tweets" }],
			},
		},
		"multiple-categories": {
			summary: "Create 3 folders",
			description:
				"Sync multiple folders in one request. Each unique folder name creates a collection.",
			value: {
				categories: [
					{ name: "Tech Tweets" },
					{ name: "Design Inspiration" },
					{ name: "Productivity Tips" },
				],
			},
		},
		"case-insensitive-dedup": {
			summary: "Case-insensitive deduplication",
			description:
				'Duplicate names that differ only by case are deduplicated — "Unique Category" and "unique category" are treated as the same. First entry wins.',
			value: {
				categories: [{ name: "Unique Category" }, { name: "unique category" }],
			},
		},
		"special-characters": {
			summary: "Folders with special characters",
			description:
				"Folder names with special characters are slugified for the collection slug.",
			value: {
				categories: [
					{ name: "Design & UX Tips!" },
					{ name: "AI/ML Resources" },
					{ name: "Product Updates (2024)" },
				],
			},
		},
		"unicode-characters": {
			summary: "Folders with unicode and emoji",
			description:
				"Folder names containing emoji or non-ASCII characters are supported.",
			value: {
				categories: [{ name: "🚀 Tech Updates" }, { name: "设计灵感" }],
			},
		},
		"empty-categories-array": {
			summary: "Validation: empty categories array",
			description: "Returns 400 — at least one category is required.",
			value: {
				categories: [],
			},
		},
		"missing-categories-field": {
			summary: "Validation: missing categories field",
			description: "Returns 400 — categories field is required.",
			value: {},
		},
		"empty-category-name": {
			summary: "Validation: empty category name",
			description: "Returns 400 — name must have a minimum length of 1.",
			value: {
				categories: [{ name: "" }],
			},
		},
	},
	responseExamples: {
		"single-category": {
			summary: "One folder created",
			description: "The folder was created as a new Recollect collection.",
			value: { data: { created: 1, skipped: 0 }, error: null },
		},
		"multiple-categories": {
			summary: "Three folders created",
			description: "All three folders created as new collections.",
			value: { data: { created: 3, skipped: 0 }, error: null },
		},
		"case-insensitive-dedup": {
			summary: "Duplicate skipped",
			description:
				"The second name matched an existing collection (case-insensitive), so it was skipped.",
			value: { data: { created: 1, skipped: 1 }, error: null },
		},
		"special-characters": {
			summary: "Special character folders created",
			description:
				"Folders with special characters in their names created successfully.",
			value: { data: { created: 3, skipped: 0 }, error: null },
		},
		"unicode-characters": {
			summary: "Unicode folders created",
			description:
				"Folders with emoji and non-ASCII characters created successfully.",
			value: { data: { created: 2, skipped: 0 }, error: null },
		},
	},
	response400Examples: {
		"empty-categories-array": {
			summary: "Empty array rejected",
			description: "The categories array must contain at least one category.",
			value: {
				data: null,
				error: "categories: Array must contain at least 1 element(s)",
			},
		},
		"missing-categories-field": {
			summary: "Missing field rejected",
			description: "Request body must include a categories array.",
			value: { data: null, error: "categories: Required" },
		},
		"empty-category-name": {
			summary: "Empty name rejected",
			description: "Each category name must be at least 1 character long.",
			value: {
				data: null,
				error:
					"categories[0].name: String must contain at least 1 character(s)",
			},
		},
	},
	additionalResponses: {
		400: { description: "Invalid request body or category data" },
		409: {
			description:
				"Duplicate category name detected (race condition — retry request)",
		},
	},
} satisfies EndpointSupplement;
