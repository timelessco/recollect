import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { DeleteBookmarkPayload, PaginatedBookmarks } from "../../../types/apiTypes";
import type { DeleteBookmarkOutput } from "@/app/api/v2/bookmark/delete-bookmark/schema";

import { api } from "@/lib/api-helpers/api-v2";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  V2_DELETE_BOOKMARK_DATA_API,
} from "../../../utils/constants";

// dels bookmark optimistically
export default function useDeleteBookmarksOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const { sortBy } = useGetSortBy();

  const deleteBookmarkOptismicMutation = useMutation({
    mutationFn: (payload: DeleteBookmarkPayload) =>
      api
        .post(V2_DELETE_BOOKMARK_DATA_API, { json: { deleteData: payload.deleteData } })
        .json<DeleteBookmarkOutput>(),
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<PaginatedBookmarks>([
        BOOKMARKS_KEY,
        session?.user?.id,
        CATEGORY_ID,
        sortBy,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData<PaginatedBookmarks>(
        [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
        (old) => {
          if (typeof old === "object") {
            return {
              ...old,
              pages: old?.pages?.map((page) =>
                page?.filter(
                  (item) => !data.deleteData?.some((findItem) => findItem?.id === item?.id),
                ),
              ),
            };
          }

          return old;
        },
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (
      _err,
      _variables,
      context?: {
        previousData: PaginatedBookmarks | undefined;
      },
    ) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
          context.previousData,
        );
      }
    },
    // Always refetch after error or success:
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });

      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });
    },
  });

  return { deleteBookmarkOptismicMutation };
}
