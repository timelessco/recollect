/**
 * @module Build-time only
 */

export const raindropImportRequestExamples = {
	"mixed-categories-batch": {
		summary: "Import 3 bookmarks with mixed categories",
		description:
			"Import bookmarks with different category_name values in one batch. Unsorted and unread categories are handled automatically. Returns queued: 3, skipped: 0 for new URLs.",
		value: {
			bookmarks: [
				{
					url: "https://v0.app/chat/react-view-transitions-u0iKm2LIxil?utm_source=sahaj-jj&utm_medium=referral&utm_campaign=share_chat&ref=35O8TY",
					title: "React view transitions - v0 by Vercel",
					description:
						"use view transitions in react to demo switching between alternate layouts (list ↔ grid ↔ masonry)",
					ogImage: "https://v0.app/chat/api/og/u0iKm2LIxil",
					category_name: "Unsorted",
					inserted_at: "2025-11-16T09:25:32.574Z",
				},
				{
					url: "https://www.animate-code.com",
					title: "Beautiful code animations - AnimateCode",
					description:
						"AnimateCode lets you create stunning keynote-inspired transitions for your code.",
					ogImage: "https://animate-code.com/thumbnail.png",
					category_name: "unread",
					inserted_at: "2025-04-10T17:10:54.000Z",
				},
				{
					url: "https://magicui.design/docs/components/icon-cloud",
					title: "Interactive Icon Cloud",
					description: "An interactive 3D tag cloud component",
					ogImage:
						"https://magicui.design/og?title=Icon%20Cloud&description=An%20interactive%203D%20tag%20cloud%20component",
					category_name: "unread",
					inserted_at: "2025-03-18T17:04:43.000Z",
				},
			],
		},
	},
	"single-bookmark-unsorted": {
		summary: "Import single bookmark to Unsorted",
		description:
			"Import one bookmark to the Unsorted collection. Returns queued: 1, skipped: 0 when the URL has not been imported before.",
		value: {
			bookmarks: [
				{
					url: "https://oscargabriel.dev/blog/tanstacks-open-ai-sdk",
					title: "TanStack's Open. AI. SDK.",
					description:
						"TanStack AI takes the headless, vendor-agnostic philosophy that made TanStack famous and applies it to AI development.",
					ogImage: "https://oscargabriel.dev/images/lilo-and-stitch.jpg",
					category_name: "Unsorted",
					inserted_at: "2025-12-07T18:22:14.710Z",
				},
			],
		},
	},
	"deduplicate-same-url": {
		summary: "Re-import same URL (expect skipped: 1)",
		description:
			"Re-importing a URL that was already imported returns queued: 0, skipped: 1. Run this after single-bookmark-unsorted to observe deduplication.",
		value: {
			bookmarks: [
				{
					url: "https://oscargabriel.dev/blog/tanstacks-open-ai-sdk",
					title: "TanStack's Open. AI. SDK.",
					description: "Different description but same URL",
					ogImage: null,
					category_name: "unread",
					inserted_at: "2025-12-07T18:22:14.710Z",
				},
			],
		},
	},
	"batch-in-memory-dedup": {
		summary: "Two identical URLs in one batch (expect queued: 1, skipped: 1)",
		description:
			"Sending duplicate URLs within the same request triggers in-memory deduplication before hitting the database. The second entry is skipped before any DB query.",
		value: {
			bookmarks: [
				{
					url: "https://example.com/unique-url-dedup-test",
					title: "First Copy",
					description: "This one should be imported",
					ogImage: null,
					category_name: "Unsorted",
					inserted_at: "2025-01-01T00:00:00.000Z",
				},
				{
					url: "https://example.com/unique-url-dedup-test",
					title: "Second Copy",
					description: "This one should be skipped (in-memory deduplicate)",
					ogImage: null,
					category_name: "Unsorted",
					inserted_at: "2025-01-01T00:00:00.000Z",
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
			"The url field must be a valid URL. A plain string without protocol fails URL schema validation.",
		value: {
			bookmarks: [
				{
					url: "not-a-valid-url",
					title: "Invalid URL Test",
					description: null,
					ogImage: null,
					category_name: null,
					inserted_at: null,
				},
			],
		},
	},
	"missing-url-field": {
		summary: "Validation: missing url property (400)",
		description:
			"The url field is required on each bookmark. Omitting it fails schema validation.",
		value: {
			bookmarks: [
				{
					title: "Missing URL Test",
					description: null,
					ogImage: null,
					category_name: null,
					inserted_at: null,
				},
			],
		},
	},
} as const;

export const raindropImportResponseExamples = {
	"mixed-categories-batch": {
		summary: "Batch queued",
		description: "All 3 bookmarks were new and queued for import.",
		value: { data: { queued: 3, skipped: 0 }, error: null },
	},
	"single-bookmark-unsorted": {
		summary: "Single bookmark queued",
		description: "One new bookmark accepted and queued for import.",
		value: { data: { queued: 1, skipped: 0 }, error: null },
	},
	"deduplicate-same-url": {
		summary: "URL already imported",
		description:
			"The URL was previously imported, so it's skipped to avoid duplicates.",
		value: { data: { queued: 0, skipped: 1 }, error: null },
	},
	"batch-in-memory-dedup": {
		summary: "In-memory dedup applied",
		description:
			"Duplicate URL within the same request is caught before hitting the database.",
		value: { data: { queued: 1, skipped: 1 }, error: null },
	},
} as const;

export const raindropImport400Examples = {
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
	"missing-url-field": {
		summary: "Missing url field",
		description: "Each bookmark object must include a url property.",
		value: {
			data: null,
			error: "Invalid input: expected string, received undefined",
		},
	},
} as const;
