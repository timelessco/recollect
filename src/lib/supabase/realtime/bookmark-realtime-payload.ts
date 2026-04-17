import { z } from "zod";

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
 * pipeline for its media type has finished writing.
 *
 * - PDF (`meta_data.mediaType === "application/pdf"`): the PDF flow writes
 *   `ogImage` to the thumbnail URL via `uploadFileRemainingData` and never
 *   touches `meta_data.screenshot`, so terminal = `ogImage` populated.
 * - Regular URL: the screenshot route writes `meta_data.screenshot` (t2) and
 *   `after()` enrichment writes the final `ogImage` (t3); terminal = both.
 */
export function isRowTerminal(row: BookmarkRealtimeRow): boolean {
  const meta = row.meta_data && typeof row.meta_data === "object" ? row.meta_data : null;
  const mediaType = typeof meta?.mediaType === "string" ? meta.mediaType : null;

  if (mediaType === "application/pdf") {
    return Boolean(row.ogImage);
  }

  const screenshot = meta?.screenshot ?? null;
  return Boolean(screenshot) && Boolean(row.ogImage);
}
