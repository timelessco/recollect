"use client";

import { clientLogger } from "./axiom-client";

/**
 * Named event emitter for client wide events.
 *
 * Call-sites pass a plain payload object — the identity formatter on
 * `clientLogger` stringifies it into `fields.payload`, so no payload key
 * can leak out as a top-level Axiom column.
 *
 * PII rules enforced by caller, not here: never pass raw emails, bookmark
 * titles, or URL queries. Prefer hashed/bucketed values. `user_id` is
 * injected automatically by the formatter.
 */
export function emitClientEvent(eventName: string, payload: Record<string, unknown> = {}): void {
  clientLogger.info(eventName, payload);
}

/**
 * Emit a `route_change` with a normalized payload. Callers pass raw
 * pathnames; this helper collects the current query-string keys (no
 * values — we never log user-entered query text).
 */
export function emitRouteChange(from: string, to: string): void {
  emitClientEvent("route_change", {
    from,
    to,
    query_keys: readQueryKeys(),
  });
}

function readQueryKeys(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const params = new URLSearchParams(window.location.search);
  const keys: string[] = [];
  for (const key of params.keys()) {
    keys.push(key);
  }
  return keys.join(",");
}

/**
 * Hash-bucket a collection id so analysts can correlate "the same share
 * link was copied N times" without enumerating private collection ids.
 * First 8 hex chars of a djb2-style hash — cheap, stable, non-reversible
 * enough for telemetry.
 */
export function hashCollectionId(id: number | string): string {
  const input = String(id);
  const MOD = 2 ** 32;
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.codePointAt(i) ?? 0;
    hash = (hash * 33 + code) % MOD;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Bucket a category identifier into a low-cardinality string for
 * downstream grouping.
 *
 *   - numeric id (real collection) → `"collection"`
 *   - `"uncategorized"`            → `"inbox"`
 *   - `"trash"` / `"discover"` / `"everything"` → literal
 *   - media-type slugs (images, videos, …) → `"type_view"`
 *   - anything else → `"other"`
 */
const LITERAL_BUCKETS = new Set(["discover", "everything", "trash"]);
const TYPE_VIEW_SLUGS = new Set([
  "audios",
  "documents",
  "images",
  "instagram",
  "links",
  "tweets",
  "videos",
]);

/**
 * Bucket a sidebar href (like `/everything` or `/funky-mhd2z350`) into
 * the same low-cardinality strings `bucketCategory` produces. Used at
 * the `category_switch` fire site where the caller only knows the
 * destination URL, not the underlying category id.
 */
export function bucketHref(href: string): string {
  const slug = href.startsWith("/") ? href.slice(1) : href;
  if (!slug) {
    return "unknown";
  }
  if (slug === "uncategorized") {
    return "inbox";
  }
  if (LITERAL_BUCKETS.has(slug)) {
    return slug;
  }
  if (TYPE_VIEW_SLUGS.has(slug)) {
    return "type_view";
  }
  return "collection";
}

export function bucketCategory(categoryId: number | string | null | undefined): string {
  // `category_id: 0` is the Uncategorized sentinel (see root CLAUDE.md) —
  // classify it the same as the `"uncategorized"` string slug below so the
  // `category_bucket` dimension stays consistent across the two code paths.
  if (categoryId === 0) {
    return "inbox";
  }
  if (typeof categoryId === "number") {
    return "collection";
  }
  if (!categoryId) {
    return "unknown";
  }
  if (categoryId === "uncategorized") {
    return "inbox";
  }
  if (LITERAL_BUCKETS.has(categoryId)) {
    return categoryId;
  }
  if (TYPE_VIEW_SLUGS.has(categoryId)) {
    return "type_view";
  }
  return "other";
}
