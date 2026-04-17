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
 * A row is terminal (safe to tear down the subscription) when both the
 * screenshot URL (stored on `meta_data.screenshot`) and the final enrichment
 * `ogImage` are populated. Either being null means the enrichment pipeline is
 * still running.
 */
export function isRowTerminal(row: BookmarkRealtimeRow): boolean {
  const screenshot =
    row.meta_data && typeof row.meta_data === "object" ? row.meta_data.screenshot : null;
  return Boolean(screenshot) && Boolean(row.ogImage);
}
