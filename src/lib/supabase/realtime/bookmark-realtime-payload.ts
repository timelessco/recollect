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
 * A row is terminal (safe to tear down the subscription) when both the
 * screenshot URL (written by the t2 screenshot route) and `meta_data.ocr_status`
 * (written only by the t3 `addRemainingBookmarkData` enrichment pass) are
 * populated.
 *
 * Using `row.ogImage` here would be wrong: the t1 insert already sets `ogImage`
 * from the scraper for any page with an `og:image` tag, so `screenshot &&
 * ogImage` would flip true at t2 and tear the channel down before t3's real
 * enrichment (coverImage, ogImgBlurUrl, ocr, keywords, height/width, final
 * ogImage) ever reaches the cache. `ocr_status` is absent pre-t3 and always
 * set to `"success" | "no_text" | "limit_reached"` post-t3, so it uniquely
 * signals that enrichment finished.
 */
export function isRowTerminal(row: BookmarkRealtimeRow): boolean {
  const metaData = row.meta_data && typeof row.meta_data === "object" ? row.meta_data : null;
  const screenshot = metaData?.screenshot ?? null;
  return Boolean(screenshot) && isBookmarkEnrichmentDone(metaData);
}
