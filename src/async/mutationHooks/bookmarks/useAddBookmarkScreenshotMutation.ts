import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SingleListData } from "../../../types/apiTypes";

import { useLoadersStore, useSupabaseSession } from "@/store/componentStore";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { errorToast } from "../../../utils/toastMessages";
import { addBookmarkScreenshot } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useAddBookmarkScreenshotMutation() {
  const queryClient = useQueryClient();

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const session = useSupabaseSession((state) => state.session);
  const { sortBy } = useGetSortBy();
  const { removeLoadingBookmarkId } = useLoadersStore();

  const addBookmarkScreenshotMutation = useMutation({
    mutationFn: addBookmarkScreenshot,
    onError: (error) => {
      errorToast(`Screenshot error: ${error.message}`);
    },
    onSettled: (apiResponse, _error, variables) => {
      const response = apiResponse as { data: { data: SingleListData[] } };
      if (response?.data?.data[0]?.id) {
        removeLoadingBookmarkId(response?.data?.data[0]?.id);
      }

      // Fallback animation cleanup — removes URL from animating set
      // in case the blur-up onAnimationComplete never fires
      useLoadersStore.getState().removeAnimatingBookmark(variables.url);

      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
      });
    },
  });

  return { addBookmarkScreenshotMutation };
}
