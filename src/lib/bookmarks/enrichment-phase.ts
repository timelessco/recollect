/**
 * `meta_data.ocr_status` is the canonical "t3 enrichment ran" signal.
 *
 * The bookmark add pipeline writes the `everything` row in three server steps:
 *   t1  `addBookmarkMinData`       — scraper OG/favicon/mediaType
 *   t2  screenshot route            — `meta_data.screenshot` (R2 upload URL)
 *   t3  `addRemainingBookmarkData`  — coverImage, ogImgBlurUrl, OCR, keywords,
 *                                     final ogImage, **and `ocr_status`**
 *
 * `ocr_status` is absent pre-t3 and always set to
 * `"success" | "no_text" | "limit_reached"` once t3 has run, so it's the
 * cleanest way to distinguish the transitional t2→t3 window from post-t3.
 * `coverImage` and `ogImage` are both unreliable signals (t1 writes `ogImage`,
 * and `coverImage` can legitimately stay null if the scraper image download
 * failed).
 *
 * Consumers:
 *   - `isRowTerminal` (realtime subscription teardown)
 *   - `getImgForPost` (card renderer — screenshot wins during t2→t3 gap)
 */
export function isBookmarkEnrichmentDone(
  metaData: { ocr_status?: null | string } | null | undefined,
): boolean {
  return Boolean(metaData?.ocr_status);
}
