/**
 * @module Build-time only
 */

export const raindropImportRequestExamples = {
  "batch-in-memory-dedup": {
    description:
      "Sending duplicate URLs within the same request triggers in-memory deduplication before hitting the database. The second entry is skipped before any DB query.",
    summary: "Two identical URLs in one batch (expect queued: 1, skipped: 1)",
    value: {
      bookmarks: [
        {
          category_name: "Unsorted",
          description: "This one should be imported",
          inserted_at: "2025-01-01T00:00:00.000Z",
          ogImage: null,
          title: "First Copy",
          url: "https://example.com/unique-url-dedup-test",
        },
        {
          category_name: "Unsorted",
          description: "This one should be skipped (in-memory deduplicate)",
          inserted_at: "2025-01-01T00:00:00.000Z",
          ogImage: null,
          title: "Second Copy",
          url: "https://example.com/unique-url-dedup-test",
        },
      ],
    },
  },
  "deduplicate-same-url": {
    description:
      "Re-importing a URL that was already imported returns queued: 0, skipped: 1. Run this after single-bookmark-unsorted to observe deduplication.",
    summary: "Re-import same URL (expect skipped: 1)",
    value: {
      bookmarks: [
        {
          category_name: "unread",
          description: "Different description but same URL",
          inserted_at: "2025-12-07T18:22:14.710Z",
          ogImage: null,
          title: "TanStack's Open. AI. SDK.",
          url: "https://oscargabriel.dev/blog/tanstacks-open-ai-sdk",
        },
      ],
    },
  },
  "empty-bookmarks-array": {
    description:
      "Sending an empty bookmarks array fails validation. Returns 400 with 'At least one bookmark required'.",
    summary: "Validation: empty array (400)",
    value: {
      bookmarks: [],
    },
  },
  "invalid-url-format": {
    description:
      "The url field must be a valid URL. A plain string without protocol fails URL schema validation.",
    summary: "Validation: not a URL (400)",
    value: {
      bookmarks: [
        {
          category_name: null,
          description: null,
          inserted_at: null,
          ogImage: null,
          title: "Invalid URL Test",
          url: "not-a-valid-url",
        },
      ],
    },
  },
  "missing-url-field": {
    description: "The url field is required on each bookmark. Omitting it fails schema validation.",
    summary: "Validation: missing url property (400)",
    value: {
      bookmarks: [
        {
          category_name: null,
          description: null,
          inserted_at: null,
          ogImage: null,
          title: "Missing URL Test",
        },
      ],
    },
  },
  "mixed-categories-batch": {
    description:
      "Import bookmarks with different category_name values in one batch. Unsorted and unread categories are handled automatically. Returns queued: 3, skipped: 0 for new URLs.",
    summary: "Import 3 bookmarks with mixed categories",
    value: {
      bookmarks: [
        {
          category_name: "Unsorted",
          description:
            "use view transitions in react to demo switching between alternate layouts (list ↔ grid ↔ masonry)",
          inserted_at: "2025-11-16T09:25:32.574Z",
          ogImage: "https://v0.app/chat/api/og/u0iKm2LIxil",
          title: "React view transitions - v0 by Vercel",
          url: "https://v0.app/chat/react-view-transitions-u0iKm2LIxil?utm_source=sahaj-jj&utm_medium=referral&utm_campaign=share_chat&ref=35O8TY",
        },
        {
          category_name: "unread",
          description:
            "AnimateCode lets you create stunning keynote-inspired transitions for your code.",
          inserted_at: "2025-04-10T17:10:54.000Z",
          ogImage: "https://animate-code.com/thumbnail.png",
          title: "Beautiful code animations - AnimateCode",
          url: "https://www.animate-code.com",
        },
        {
          category_name: "unread",
          description: "An interactive 3D tag cloud component",
          inserted_at: "2025-03-18T17:04:43.000Z",
          ogImage:
            "https://magicui.design/og?title=Icon%20Cloud&description=An%20interactive%203D%20tag%20cloud%20component",
          title: "Interactive Icon Cloud",
          url: "https://magicui.design/docs/components/icon-cloud",
        },
      ],
    },
  },
  "single-bookmark-unsorted": {
    description:
      "Import one bookmark to the Unsorted collection. Returns queued: 1, skipped: 0 when the URL has not been imported before.",
    summary: "Import single bookmark to Unsorted",
    value: {
      bookmarks: [
        {
          category_name: "Unsorted",
          description:
            "TanStack AI takes the headless, vendor-agnostic philosophy that made TanStack famous and applies it to AI development.",
          inserted_at: "2025-12-07T18:22:14.710Z",
          ogImage: "https://oscargabriel.dev/images/lilo-and-stitch.jpg",
          title: "TanStack's Open. AI. SDK.",
          url: "https://oscargabriel.dev/blog/tanstacks-open-ai-sdk",
        },
      ],
    },
  },
} as const;

export const raindropImportResponseExamples = {
  "batch-in-memory-dedup": {
    description: "Duplicate URL within the same request is caught before hitting the database.",
    summary: "In-memory dedup applied",
    value: { data: { queued: 1, skipped: 1 }, error: null },
  },
  "deduplicate-same-url": {
    description: "The URL was previously imported, so it's skipped to avoid duplicates.",
    summary: "URL already imported",
    value: { data: { queued: 0, skipped: 1 }, error: null },
  },
  "mixed-categories-batch": {
    description: "All 3 bookmarks were new and queued for import.",
    summary: "Batch queued",
    value: { data: { queued: 3, skipped: 0 }, error: null },
  },
  "single-bookmark-unsorted": {
    description: "One new bookmark accepted and queued for import.",
    summary: "Single bookmark queued",
    value: { data: { queued: 1, skipped: 0 }, error: null },
  },
} as const;

export const raindropImport400Examples = {
  "empty-bookmarks-array": {
    description: "The bookmarks array must contain at least one item.",
    summary: "Empty array rejected",
    value: { data: null, error: "At least one bookmark required" },
  },
  "invalid-url-format": {
    description: "The url field must be a valid URL with a protocol.",
    summary: "Invalid URL format",
    value: { data: null, error: "Invalid URL" },
  },
  "missing-url-field": {
    description: "Each bookmark object must include a url property.",
    summary: "Missing url field",
    value: {
      data: null,
      error: "Invalid input: expected string, received undefined",
    },
  },
} as const;
