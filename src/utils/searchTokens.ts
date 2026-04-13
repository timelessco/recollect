import { colorsNamed } from "culori";

import type { OklabColor } from "@/async/ai/schemas/image-analysis-schema";

import { CONTENT_TYPES } from "@/async/ai/schemas/image-analysis-schema";
import { parseSearchColor } from "@/utils/colorUtils";
import { GET_HASHTAG_TAG_PATTERN, TAG_MARKUP_REGEX } from "@/utils/constants";

export interface ColorHint {
  /** OKLAB triple parsed via the existing `parseSearchColor`. */
  oklab: OklabColor;
  /** What the user typed, e.g. "#red" or "#FF0000". Useful for logs. */
  raw: string;
  /** Tag name to look up (case-insensitive on the SQL side). */
  tagName: string;
}

export interface ParsedSearch {
  /** OR-paired tag-name + color hints, capped at 3. */
  colorHints: ColorHint[];
  /** AND-required tag names (lowercased). */
  plainTags: string[];
  /** Search text with all #tokens stripped and trimmed. */
  text: string;
  /** Matched content-type names (lowercased, from image_keywords.type allowlist). */
  typeHints: string[];
}

const HEX_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const MAX_COLOR_HINTS = 3;
const MAX_TYPE_HINTS = 3;

/** Lowercase CSS color name allowlist (sourced from Culori's colorsNamed map). */
export const CSS_COLOR_NAMES: ReadonlySet<string> = new Set(Object.keys(colorsNamed));

export const KNOWN_TYPES: ReadonlySet<string> = new Set(CONTENT_TYPES);

/**
 * Extract the body of a #token. Handles both bare hashes (`#red`) and the
 * react-mentions markup format (`#[display](id)`) used by the search input.
 */
function extractTokenBody(token: string): string {
  const markupMatch = token.match(TAG_MARKUP_REGEX);
  const display = markupMatch?.groups?.display;
  return display ?? token.replace("#", "");
}

/**
 * Parse the raw search input into text, plain tags, and color hints.
 *
 * - Hex tokens (3/4/6/8 digit) → colorHint, tagName uppercased.
 * - CSS color names (e.g. `#red`, `#brown`) → colorHint, tagName preserved.
 * - Anything else → plain tag (AND-required), lowercased.
 *
 * Color hints are deduped case-insensitively and capped at MAX_COLOR_HINTS.
 * The SQL side uses `LOWER(...) = LOWER(...)` for the actual tag-name match.
 */
export function parseSearchTokens(raw: string): ParsedSearch {
  const matches = raw.match(GET_HASHTAG_TAG_PATTERN) ?? [];

  const plainTagsSet = new Set<string>();
  const typeHintsSet = new Set<string>();
  const hintsByTagName = new Map<string, ColorHint>();

  for (const token of matches) {
    const body = extractTokenBody(token);
    if (body.length === 0) {
      continue;
    }

    if (HEX_PATTERN.test(`#${body}`)) {
      const oklab = parseSearchColor(`#${body}`);
      if (!oklab) {
        continue;
      }
      const tagName = body.toUpperCase();
      const dedupKey = tagName.toLowerCase();
      if (!hintsByTagName.has(dedupKey)) {
        hintsByTagName.set(dedupKey, { raw: token, tagName, oklab });
      }
      continue;
    }

    if (CSS_COLOR_NAMES.has(body.toLowerCase())) {
      const oklab = parseSearchColor(body);
      if (!oklab) {
        continue;
      }
      const dedupKey = body.toLowerCase();
      if (!hintsByTagName.has(dedupKey)) {
        hintsByTagName.set(dedupKey, { raw: token, tagName: body, oklab });
      }
      continue;
    }

    if (KNOWN_TYPES.has(body.toLowerCase())) {
      typeHintsSet.add(body.toLowerCase());
      continue;
    }

    plainTagsSet.add(body.toLowerCase());
  }

  const text = raw.replace(GET_HASHTAG_TAG_PATTERN, "").trim();
  const colorHints = [...hintsByTagName.values()].slice(0, MAX_COLOR_HINTS);
  const plainTags = [...plainTagsSet];
  const typeHints = [...typeHintsSet].slice(0, MAX_TYPE_HINTS);

  return { text, plainTags, colorHints, typeHints };
}
