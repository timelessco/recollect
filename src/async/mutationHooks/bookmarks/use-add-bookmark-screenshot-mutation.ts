import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AddBookmarkScreenshotPayloadTypes, SingleListData } from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { api } from "../../../lib/api-helpers/api-v2";
import { teardownBookmarkEnrichmentSubscription } from "../../../lib/supabase/realtime/bookmark-enrichment-subscription";
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
        void teardownBookmarkEnrichmentSubscription(variables.id, "screenshot_failed");
      }
    },
    onSettled: (response) => {
      if (response?.[0]?.id) {
        removeLoadingBookmarkId(response[0].id);
      }

      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
      });
    },
  });

  return { addBookmarkScreenshotMutation };
}
