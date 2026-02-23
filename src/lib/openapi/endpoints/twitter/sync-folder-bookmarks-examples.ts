/**
 * @module Build-time only
 */

export const twitterSyncFolderBookmarksRequestExamples = {
	"single-link": {
		summary: "Link one bookmark to one folder",
		description:
			"Queue a single bookmark-to-collection mapping. Prerequisite: folder and bookmark must already exist.",
		value: {
			mappings: [
				{
					category_name: "Tech Tweets",
					url: "https://x.com/SawyerMerritt/status/1986170355535286529",
				},
			],
		},
	},
	"multiple-links": {
		summary: "Link 2 bookmarks to different folders",
		description:
			"Queue multiple bookmark-to-collection mappings in one request.",
		value: {
			mappings: [
				{
					category_name: "Tech Tweets",
					url: "https://x.com/narendramodi/status/1984243645050945961",
				},
				{
					category_name: "Design Inspiration",
					url: "https://x.com/elonmusk/status/1985699323099713668",
				},
			],
		},
	},
	"same-bookmark-multiple-categories": {
		summary: "One bookmark linked to 3 folders",
		description: "A single bookmark can belong to multiple collections.",
		value: {
			mappings: [
				{
					category_name: "Tech Tweets",
					url: "https://x.com/testuser/status/1990000000000000001",
				},
				{
					category_name: "Design Inspiration",
					url: "https://x.com/testuser/status/1990000000000000001",
				},
				{
					category_name: "Productivity Tips",
					url: "https://x.com/testuser/status/1990000000000000001",
				},
			],
		},
	},
	"large-batch-6-mappings": {
		summary: "Large batch — 6 mappings across 3 folders",
		description: "Queue 6 bookmark-to-collection mappings in a single request.",
		value: {
			mappings: [
				{
					category_name: "Tech Tweets",
					url: "https://x.com/testuser/status/1990000000000000010",
				},
				{
					category_name: "Tech Tweets",
					url: "https://x.com/testuser/status/1990000000000000011",
				},
				{
					category_name: "Tech Tweets",
					url: "https://x.com/testuser/status/1990000000000000012",
				},
				{
					category_name: "Design Inspiration",
					url: "https://x.com/testuser/status/1990000000000000013",
				},
				{
					category_name: "Design Inspiration",
					url: "https://x.com/testuser/status/1990000000000000014",
				},
				{
					category_name: "Productivity Tips",
					url: "https://x.com/testuser/status/1990000000000000015",
				},
			],
		},
	},
	"empty-mappings-array": {
		summary: "Validation: empty mappings array",
		description: "Returns 400 — at least one mapping is required.",
		value: {
			mappings: [],
		},
	},
	"missing-mappings-field": {
		summary: "Validation: missing mappings field",
		description: "Returns 400 — mappings field is required.",
		value: {},
	},
	"missing-category-name": {
		summary: "Validation: missing category_name",
		description: "Returns 400 — category_name is required in each mapping.",
		value: {
			mappings: [
				{
					url: "https://x.com/testuser/status/1990000000000000001",
				},
			],
		},
	},
	"empty-category-name": {
		summary: "Validation: empty category_name",
		description: "Returns 400 — category_name must have a minimum length of 1.",
		value: {
			mappings: [
				{
					category_name: "",
					url: "https://x.com/testuser/status/1990000000000000001",
				},
			],
		},
	},
	"missing-url": {
		summary: "Validation: missing url",
		description: "Returns 400 — url is required in each mapping.",
		value: {
			mappings: [
				{
					category_name: "Tech Tweets",
				},
			],
		},
	},
	"invalid-url-format": {
		summary: "Validation: invalid URL format",
		description: "Returns 400 — url must be a valid URL.",
		value: {
			mappings: [
				{
					category_name: "Tech Tweets",
					url: "not-a-valid-url",
				},
			],
		},
	},
} as const;

export const twitterSyncFolderBookmarksResponse200Examples = {
	"single-link": {
		summary: "One mapping queued",
		value: { data: { queued: 1 }, error: null },
	},
	"multiple-links": {
		summary: "Two mappings queued",
		value: { data: { queued: 2 }, error: null },
	},
	"same-bookmark-multiple-categories": {
		summary: "Three mappings queued",
		value: { data: { queued: 3 }, error: null },
	},
	"large-batch-6-mappings": {
		summary: "Six mappings queued",
		value: { data: { queued: 6 }, error: null },
	},
} as const;

export const twitterSyncFolderBookmarksResponse400Examples = {
	"empty-mappings-array": {
		summary: "Empty array rejected",
		value: {
			data: null,
			error: "mappings: Array must contain at least 1 element(s)",
		},
	},
	"missing-mappings-field": {
		summary: "Missing field rejected",
		value: { data: null, error: "mappings: Required" },
	},
	"missing-category-name": {
		summary: "Missing category_name rejected",
		value: { data: null, error: "mappings[0].category_name: Required" },
	},
	"empty-category-name": {
		summary: "Empty category_name rejected",
		value: {
			data: null,
			error:
				"mappings[0].category_name: String must contain at least 1 character(s)",
		},
	},
	"missing-url": {
		summary: "Missing url rejected",
		value: { data: null, error: "mappings[0].url: Required" },
	},
	"invalid-url-format": {
		summary: "Invalid URL rejected",
		value: { data: null, error: "mappings[0].url: Invalid url" },
	},
} as const;
