import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ClearBookmarkTrashOutput } from "@/app/api/v2/bookmark/clear-bookmark-trash/schema";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  V2_CLEAR_BOOKMARK_TRASH_API,
} from "../../../utils/constants";

// clears trash
export default function useClearBookmarksInTrashMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const clearBookmarksInTrashMutation = useMutation({
    mutationFn: () =>
      api.post(V2_CLEAR_BOOKMARK_TRASH_API, { json: {} }).json<ClearBookmarkTrashOutput>(),
    onSuccess: () => {
      // Invalidate and refetch
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });
    },
  });

  return {
    clearBookmarksInTrashMutation,
    isPending: clearBookmarksInTrashMutation.isPending,
  };
}
