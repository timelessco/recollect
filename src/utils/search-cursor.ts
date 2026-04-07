/**
 * Opaque cursor for two-phase bookmark search pagination.
 *
 * Phase 1 ("tag") scans `search_bookmarks_url_tag_scope`.
 * Phase 2 ("color") scans `search_bookmarks_color_array_scope`.
 *
 * Wire format: base64url-encoded JSON `{phase, offset}`. Empty input
 * (or undefined) means "first page of tag phase". The cursor does NOT
 * carry the search query — the client always re-sends `search` and
 * `category_id` so the server can re-derive `tagTokens` and `colorTokens`.
 */

export type SearchPhase = "color" | "tag";

export interface SearchCursor {
  offset: number;
  phase: SearchPhase;
}

const INITIAL_CURSOR: SearchCursor = { offset: 0, phase: "tag" };

export function encodeSearchCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/**
 * Decode an incoming cursor string. Returns the initial cursor for empty
 * input. Throws on any malformed input — the route handler converts the
 * throw into a 400 RecollectApiError.
 */
export function decodeSearchCursor(raw: string | undefined): SearchCursor {
  if (!raw) {
    return INITIAL_CURSOR;
  }

  let json: string;
  try {
    json = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    throw new Error("invalid cursor: not base64url");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("invalid cursor: not JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("invalid cursor: not an object");
  }
  if (!("phase" in parsed) || (parsed.phase !== "tag" && parsed.phase !== "color")) {
    throw new Error("invalid cursor: phase must be 'tag' or 'color'");
  }
  if (
    !("offset" in parsed) ||
    typeof parsed.offset !== "number" ||
    !Number.isInteger(parsed.offset) ||
    parsed.offset < 0
  ) {
    throw new Error("invalid cursor: offset must be a non-negative integer");
  }

  return { offset: parsed.offset, phase: parsed.phase };
}
