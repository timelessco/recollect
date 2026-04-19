import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  AddBookmarkScreenshotPayloadTypes,
  PaginatedBookmarks,
  SingleListData,
} from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { api } from "../../../lib/api-helpers/api-v2";
import { useLoadersStore, useSupabaseSession } from "../../../store/componentStore";
import { BOOKMARKS_KEY, V2_ADD_URL_SCREENSHOT_API } from "../../../utils/constants";
import { errorToast } from "../../../utils/toastMessages";

// get bookmark screenshot
export default function useAddBookmarkScreenshotMutation() {
  const queryClient = useQueryClient();

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const session = useSupabaseSession((state) => state.session);
  const { sortBy } = useGetSortBy();
  const { removeLoadingBookmarkId } = useLoadersStore();

  const addBookmarkScreenshotMutation = useMutation({
    mutationFn: (payload: AddBookmarkScreenshotPayloadTypes) =>
      // ky default timeout is 10s, but the server-side screenshot capture has a
      // 30s budget plus R2 upload + DB writes — completions of 11–24s are normal.
      // Aborting at 10s makes the browser cancel a request the server still
      // finishes, surfacing a misleading "Screenshot error" toast on a successful row.
      api
        .post(V2_ADD_URL_SCREENSHOT_API, { json: payload, timeout: 60_000 })
        .json<SingleListData[]>(),
    onError: (error, variables) => {
      errorToast(`Screenshot error: ${error.message}`);
      if (variables.id) {
        removeLoadingBookmarkId(variables.id);
      }
    },
    onSettled: (response) => {
      if (response?.[0]) {
        const [updated] = response;

        // Inject the screenshot response into the paginated cache
        // synchronously, in the SAME callback as removeLoadingBookmarkId.
        // React batches the two updates into a single render — the card
        // never sees (img=null && isLoading=false) and so never falls
        // through the statusText ladder to TERMINAL.
        //
        // The prior approach (`await invalidateQueries` then
        // removeLoadingBookmarkId) looked correct on paper, but in
        // practice the cache notify and the Zustand store update
        // committed in two separate React renders — the first render
        // landed (img=null, isLoading=false) and produced the exit-side
        // "Cannot fetch image..." flash. Synchronous injection
        // eliminates that race. The screenshot response is the source
        // of truth for ogImage at this point: the route handler just
        // backfilled it from the captured screenshot (when the scraped
        // ogImage was missing or malformed) and returned the updated
        // row. A background refetch (below) still picks up later
        // addRemainingBookmarkData() enrichments (img_caption, ocr,
        // blurhash, additional cover images).
        queryClient.setQueryData<PaginatedBookmarks>(
          [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
          (old) => {
            if (!old) {
              return old;
            }
            return {
              ...old,
              pages: old.pages.map((page) =>
                page.map((bookmark) =>
                  bookmark.id === updated.id ? { ...bookmark, ...updated } : bookmark,
                ),
              ),
            } as PaginatedBookmarks;
          },
        );

        removeLoadingBookmarkId(updated.id);
      }

      // Background refetch picks up addRemainingBookmarkData() enrichments
      // (img_caption, ocr, blurhash, additionalImages, additionalVideos).
      // Fire-and-forget — does not block the loading-state transition,
      // because the cache already has a valid ogImage from the
      // setQueryData above.
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
      });
    },
  });

  return { addBookmarkScreenshotMutation };
}
