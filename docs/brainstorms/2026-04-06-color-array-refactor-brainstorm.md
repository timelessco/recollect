# Color Storage: Flatten to Sorted Array

**Date:** 2026-04-06
**Status:** Approved (user-directed)

## What We're Building

Replace the `{ primary_color: OklabColor | null, secondary_colors: OklabColor[] }` color structure with a single `OklabColor[]` array, sorted by visual dominance (most present color first). Search ranking should respect array position — index 0 gets highest precedence, then decreasing.

## Why This Approach

The primary/secondary distinction is artificial. Gemini already returns colors ordered by dominance. The split into primary + secondary adds complexity without benefit:

- Two access paths instead of one
- Different search thresholds (0.25 vs 0.15) that are hard to reason about
- The "primary" is just index 0 of what Gemini returns

A flat array with positional weighting is simpler and more natural.

## Key Decisions

1. **Storage format**: `meta_data.image_keywords.color` becomes a JSON array of `{l, a, b}` objects
2. **Ordering**: By visual dominance (Gemini already provides this ordering)
3. **Search weighting**: Positional — weight decreases with index (e.g., `1.0 / (index + 1)`)
4. **Migration**: Convert existing `{primary_color, secondary_colors}` to `[primary_color, ...secondary_colors]`
5. **Backward compat**: None needed — the old format was introduced recently (2026-03-30)

## Scope

- TypeScript types (`BookmarkColors` interface → `OklabColor[]`)
- Image analysis (`mapKeywords` — stop splitting into primary/secondary)
- Color utils (`getBookmarkColors` — read flat array)
- SQL function (`search_bookmarks_url_tag_scope` — positional weighting)
- API schemas (3 files — `BookmarkColorsSchema`)
- Data migration (convert existing rows)
