/**
 * @module Build-time only
 */

export const instagramSyncRequestExamples = {
	"single-bookmark": {
		summary: "Queue single Instagram bookmark",
		description:
			"Queue one Instagram post for async archiving. Returns inserted: 1, skipped: 0 when the URL has not been seen before.",
		value: {
			bookmarks: [
				{
					url: "https://www.instagram.com/p/TEST123/",
					title: "Test Instagram Post",
					type: "instagram",
					meta_data: {
						saved_collection_names: ["Test Collection"],
					},
					saved_at: "2024-01-15T10:30:00.000Z",
				},
			],
		},
	},
	"batch-2-bookmarks": {
		summary: "Queue batch of 2 bookmarks",
		description:
			"Queue multiple Instagram posts in one request. Bookmarks are ordered by saved_at descending during insertion. Returns inserted: 2, skipped: 0 for new URLs.",
		value: {
			bookmarks: [
				{
					url: "https://www.instagram.com/p/BATCH001/",
					title: "Batch Post 1",
					type: "instagram",
					meta_data: { saved_collection_names: ["Batch Test"] },
					saved_at: "2024-01-15T10:00:00.000Z",
				},
				{
					url: "https://www.instagram.com/p/BATCH002/",
					title: "Batch Post 2",
					type: "instagram",
					meta_data: { saved_collection_names: ["Batch Test"] },
					saved_at: "2024-01-15T09:00:00.000Z",
				},
			],
		},
	},
	"empty-bookmarks-array": {
		summary: "Validation: empty array (400)",
		description:
			"Sending an empty bookmarks array fails validation. Returns 400 with 'At least one bookmark required'.",
		value: {
			bookmarks: [],
		},
	},
	"invalid-url-format": {
		summary: "Validation: not a URL (400)",
		description:
			"URL field must be a valid URL. A plain string without protocol fails URL schema validation.",
		value: {
			bookmarks: [
				{
					url: "not-a-valid-url",
					title: "Invalid URL Test",
					type: "instagram",
				},
			],
		},
	},
	"non-instagram-hostname": {
		summary: "Validation: wrong hostname (400)",
		description:
			"URL must have instagram.com or www.instagram.com as hostname. Twitter and other domains are rejected.",
		value: {
			bookmarks: [
				{
					url: "https://twitter.com/someuser/status/123",
					title: "Wrong Hostname Test",
					type: "instagram",
				},
			],
		},
	},
	"javascript-protocol-xss": {
		summary: "Validation: javascript: protocol (400)",
		description:
			"The javascript: protocol fails URL format validation before even reaching hostname validation, blocking XSS injection attempts.",
		value: {
			bookmarks: [
				{
					// eslint-disable-next-line no-script-url
					url: "javascript:alert('xss')",
					title: "XSS Attempt Test",
					type: "instagram",
				},
			],
		},
	},
	"invalid-type-field": {
		summary: "Validation: type must be 'instagram' (400)",
		description:
			"The type field is a literal — only 'instagram' is accepted. Any other string is rejected.",
		value: {
			bookmarks: [
				{
					url: "https://www.instagram.com/p/VALIDURL/",
					title: "Wrong Type Test",
					type: "twitter",
				},
			],
		},
	},
} as const;

export const instagramSyncResponseExamples = {
	"single-bookmark": {
		summary: "Single bookmark queued",
		description: "One new Instagram post accepted and queued for processing.",
		value: { data: { inserted: 1, skipped: 0 }, error: null },
	},
	"batch-2-bookmarks": {
		summary: "Batch queued",
		description: "Both posts were new and queued successfully.",
		value: { data: { inserted: 2, skipped: 0 }, error: null },
	},
} as const;

export const instagramSync400Examples = {
	"empty-bookmarks-array": {
		summary: "Empty array rejected",
		description: "The bookmarks array must contain at least one item.",
		value: { data: null, error: "At least one bookmark required" },
	},
	"invalid-url-format": {
		summary: "Invalid URL format",
		description: "The url field must be a valid URL with a protocol.",
		value: { data: null, error: "Invalid URL" },
	},
	"non-instagram-hostname": {
		summary: "Non-Instagram hostname",
		description:
			"Only instagram.com and www.instagram.com hostnames are accepted.",
		value: { data: null, error: "Must be a valid Instagram URL" },
	},
	"javascript-protocol-xss": {
		summary: "XSS attempt blocked",
		description:
			"The javascript: protocol is rejected at URL format validation.",
		value: { data: null, error: "Invalid URL" },
	},
	"invalid-type-field": {
		summary: "Invalid type literal",
		description: 'The type field only accepts the literal string "instagram".',
		value: { data: null, error: 'Invalid input: expected "instagram"' },
	},
} as const;
