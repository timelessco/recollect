import { useCallback, useSyncExternalStore } from "react";

import {
  isBookmarkEnrichmentActive,
  subscribeToBookmarkEnrichmentChanges,
} from "@/lib/supabase/realtime/bookmark-enrichment-subscription";

/**
 * Reactive read of the subscription manager's "is this bookmark still being
 * enriched?" state. Used by the card placeholder to show a "Getting
 * screenshot" label while the server pipeline (screenshot + AI enrichment or
 * PDF thumbnail) is in flight.
 *
 * Returns `true` while a Realtime subscription is active or queued for the
 * given bookmark id; `false` once the subscription tears down (terminal
 * state, timeout, delete, sign-out, or explicit teardown on non-enriching
 * media paths).
 */
export function useBookmarkEnrichmentActive(bookmarkId: number): boolean {
  const getSnapshot = useCallback(() => isBookmarkEnrichmentActive(bookmarkId), [bookmarkId]);
  return useSyncExternalStore(subscribeToBookmarkEnrichmentChanges, getSnapshot, getSnapshot);
}
