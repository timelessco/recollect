import { z } from "zod";

import { isBookmarkEnrichmentDone } from "@/lib/bookmarks/enrichment-phase";

/**
 * Shape of `meta_data` fields the splice + terminal-state logic reads.
 * Unknown fields are preserved via `.catchall` so forward-compatible meta_data
 * additions aren't stripped before the splice helper merges into cache.
 */
const MetaDataRealtimeSchema = z
  .object({
    coverImage: z.string().nullable().optional(),
    favIcon: z.string().nullable().optional(),
    img_caption: z.string().nullable().optional(),
    isPageScreenshot: z.boolean().nullable().optional(),
    mediaType: z.string().nullable().optional(),
    ocr_status: z.enum(["limit_reached", "no_text", "success"]).nullable().optional(),
    ogImgBlurUrl: z.string().nullable().optional(),
    screenshot: z.string().nullable().optional(),
  })
  .catchall(z.unknown());

/**
 * Minimal row shape parsed from a Supabase Realtime `postgres_changes` payload
 * on `public.everything`. Columns not read by the splice helper are left
 * optional; forward-compatible columns pass through the `.catchall`.
 */
export const BookmarkRealtimeRowSchema = z
  .object({
    description: z.string().nullable().optional(),
    id: z.int(),
    inserted_at: z.string().optional(),
    make_discoverable: z.string().nullable().optional(),
    meta_data: z.union([MetaDataRealtimeSchema, z.null()]).optional(),
    ogImage: z.string().nullable().optional(),
    screenshot: z.string().nullable().optional(),
    sort_index: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    trash: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    user_id: z.string().optional(),
  })
  .catchall(z.unknown());

export type BookmarkRealtimeRow = z.infer<typeof BookmarkRealtimeRowSchema>;

export function parseBookmarkRealtimePayload(payload: unknown): BookmarkRealtimeRow | null {
  const result = BookmarkRealtimeRowSchema.safeParse(payload);
  return result.success ? result.data : null;
}

/**
 * A row is terminal (safe to tear down the subscription) when the enrichment
 * pipeline for its media type has finished writing. `ocr_status` is the
 * canonical "t3 enrichment ran" signal — absent pre-t3 and always set to
 * `"success" | "no_text" | "limit_reached"` post-t3. Gating on it (rather than
 * `ogImage`) avoids tearing down before t3's full enrichment (coverImage,
 * ogImgBlurUrl, ocr, keywords, final ogImage) reaches the cache — t1 already
 * sets `ogImage` from the scraper for any page with an `og:image` tag, so
 * `screenshot && ogImage` would flip true at t2.
 *
 * - PDF (`meta_data.mediaType === "application/pdf"`): the PDF flow writes
 *   `ogImage` to the thumbnail URL via `uploadFileRemainingData` and never
 *   touches `meta_data.screenshot`; `uploadFileRemainingData` also sets
 *   `ocr_status`, so terminal = `ogImage` + `ocr_status`.
 * - Regular URL: the screenshot route writes `meta_data.screenshot` (t2) and
 *   `addRemainingBookmarkData` writes `ocr_status` (t3); terminal = both.
 */
export function isRowTerminal(row: BookmarkRealtimeRow): boolean {
  const metaData = row.meta_data && typeof row.meta_data === "object" ? row.meta_data : null;

  if (metaData?.mediaType === "application/pdf") {
    return Boolean(row.ogImage) && isBookmarkEnrichmentDone(metaData);
  }

  const screenshot = metaData?.screenshot ?? null;
  return Boolean(screenshot) && isBookmarkEnrichmentDone(metaData);
}
