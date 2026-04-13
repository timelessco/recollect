import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { SingleListData } from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { api } from "../../../lib/api-helpers/api-v2";
import { useLoadersStore, useSupabaseSession } from "../../../store/componentStore";
import { BOOKMARKS_KEY, V2_ADD_URL_SCREENSHOT_API } from "../../../utils/constants";
import { errorToast } from "../../../utils/toastMessages";

interface AddBookmarkScreenshotPayload {
  id: number;
  url: string;
}

// get bookmark screenshot
export default function useAddBookmarkScreenshotMutation() {
  const queryClient = useQueryClient();

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const session = useSupabaseSession((state) => state.session);
  const { sortBy } = useGetSortBy();
  const { removeLoadingBookmarkId } = useLoadersStore();

  const addBookmarkScreenshotMutation = useMutation({
    mutationFn: (payload: AddBookmarkScreenshotPayload) =>
      api.post(V2_ADD_URL_SCREENSHOT_API, { json: payload }).json<SingleListData[]>(),
    onError: (error, variables) => {
      errorToast(`Screenshot error: ${error.message}`);
      if (variables.id) {
        removeLoadingBookmarkId(variables.id);
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
