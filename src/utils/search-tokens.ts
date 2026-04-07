import type { OklabColor } from "@/async/ai/schemas/image-analysis-schema";

import { parseSearchColor } from "@/utils/colorUtils";
import { GET_HASHTAG_TAG_PATTERN, TAG_MARKUP_REGEX } from "@/utils/constants";

export interface SearchTokens {
  /**
   * OKLAB triples for every `#token` that `parseSearchColor` accepted.
   * Used as parallel arrays passed to `search_bookmarks_color_array_scope`.
   */
  colorTokens: OklabColor[];
  /**
   * Display strings for every `#token` in the query (whether or not it
   * also parses as a color). Used as `tag_scope` in
   * `search_bookmarks_url_tag_scope` and as `exclude_tag_scope` in
   * `search_bookmarks_color_array_scope`.
   *
   * Tokens are lowercased so they round-trip identically through the
   * SQL `LOWER(name) = ANY(...)` filter regardless of casing.
   */
  tagTokens: string[];
}

/**
 * Extract `#tokens` from a raw search string and classify each one as
 * a tag (always) and optionally as a color. Returns empty arrays when
 * the string contains no `#`-prefixed tokens.
 */
export function classifySearchTokens(search: string): SearchTokens {
  const matches = search.match(GET_HASHTAG_TAG_PATTERN);
  if (!matches || matches.length === 0) {
    return { colorTokens: [], tagTokens: [] };
  }

  const tagTokens: string[] = [];
  const colorTokens: OklabColor[] = [];

  for (const raw of matches) {
    // TAG_MARKUP_REGEX has no /g flag, so .match returns the full result
    // including named groups (same shape as regex.exec).
    const markup = raw.match(TAG_MARKUP_REGEX);
    const display = markup?.groups?.display ?? raw.replace("#", "");
    if (display.length === 0) {
      continue;
    }
    const lowered = display.toLowerCase();
    tagTokens.push(lowered);

    const parsed = parseSearchColor(lowered);
    if (parsed) {
      colorTokens.push(parsed);
    }
  }

  return { colorTokens, tagTokens };
}
