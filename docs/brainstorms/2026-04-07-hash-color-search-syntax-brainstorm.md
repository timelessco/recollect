---
date: 2026-04-07
topic: hash-color-search-syntax
---

# Replace `color:` Search Prefix With `#`

## What We're Building

The bookmark search currently has two distinct prefixes:

- `#tagname` — filter by tag (parsed via `GET_HASHTAG_TAG_PATTERN` in both `pages/api/bookmark/search-bookmarks.ts` and `app/api/v2/bookmark/search-bookmarks/route.ts`)
- `color:blue` / `color:#ff0000` — filter by image color (parsed via `parseSearchColor` against the OKLAB columns in the `search_bookmarks_url_tag_scope` RPC)

We are unifying these under a single `#` syntax. Every `#token` is treated as a tag query first; if any token additionally parses as a CSS color name or hex value, a second color query runs after the tag results are exhausted. The `color:` prefix is removed entirely from both v1 and v2 routes.

## Why This Approach

**Approach A: Two-phase server, single endpoint** was chosen.

The search route classifies each `#token` and emits up to two RPC calls per request:

1. `search_bookmarks_url_tag_scope` with `tag_scope = [tokens]` (current behavior)
2. A new color-array RPC that takes parallel `color_l[] / color_a[] / color_b[]` and returns bookmarks whose `image_keywords.color` (primary + secondaries) contains **all** requested colors within the existing OKLAB Euclidean threshold

The handler concatenates tag results then color results, deduped by `id`. Pagination is **cursor-based** — `cursor = { phase: "tag" | "color", offset: N }`. When a tag-phase page returns fewer than the page limit, the server flips `phase = "color"` for the next request.

Rejected:

- **B: Two parallel endpoints** — splits one search across two infinite-scroll cursors and forces clients to know the merge rule. Worse from an agent-native perspective (an MCP tool would have to call both).
- **C: Single fat RPC with phase column** — overloads the already-complex `search_bookmarks_url_tag_scope` and still requires phase-aware pagination on the client.

## Key Decisions

- **Tag-first ordering**: When `#blue` matches both a tag named "blue" and bookmarks with blue colors, all tag results paginate first, then color results. Same algorithm for both phases (no relevance scoring on top).
- **Hex still hits the tag RPC**: `#ff0000` runs the tag query before the color query. Symmetric code path; tag RPC short-circuits cheaply when no row matches "ff0000".
- **Non-color words skip the color RPC**: `#typescript` doesn't `parseSearchColor` cleanly, so the color phase is suppressed entirely. Current tag-only behavior is preserved for the common case.
- **Multi-color is AND**: `#red #blue` requires bookmarks to contain _both_ a red-ish and a blue-ish color (within threshold) in `image_keywords.color`. Multiple color tokens are passed as parallel arrays to the new RPC.
- **`color:` is removed cold**: Both `pages/api/bookmark/search-bookmarks.ts` and `app/api/v2/bookmark/search-bookmarks/route.ts` lose the `color:(\S+)` regex and the `searchWithoutColor` strip. Any saved URL containing `color:blue` becomes a literal text search.
- **Reuse the current OKLAB threshold**: The new color-array RPC uses the same per-color Euclidean distance the single-color RPC uses today. Don't tighten it for multi-color matching unless results are visibly bad after rollout.
- **Server owns pagination state**: Cursor flips phase, so `useSearchBookmarks` infinite-scroll stays a single hook with one query key.

## Open Questions

None. All decisions captured above; remaining details (RPC SQL, cursor encoding, Zod schema changes, mutation hook impact, client cursor wiring) belong in the implementation plan.

## Next Steps

→ `/workflows:plan` for implementation details (new RPC migration, v2 route refactor, schema/Zod updates, infinite-scroll cursor change, removal of `color:` from both v1 and v2 routes).
