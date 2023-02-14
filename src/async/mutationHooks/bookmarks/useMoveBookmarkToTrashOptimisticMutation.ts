import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import type { BookmarksPaginatedDataTypes } from "../../../types/apiTypes";
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY } from "../../../utils/constants";
import { moveBookmarkToTrash } from "../../supabaseCrudHelpers";

// move bookmark to trash optimistically
export default function useMoveBookmarkToTrashOptimisticMutation() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const moveBookmarkToTrashOptimisticMutation = useMutation(
    moveBookmarkToTrash,
    {
      onMutate: async data => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          CATEGORY_ID,
        ]);

        // Snapshot the previous value
        const previousData = queryClient.getQueryData([
          BOOKMARKS_KEY,
          session?.user?.id,
          CATEGORY_ID,
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData<BookmarksPaginatedDataTypes>(
          [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID],
          old => {
            if (typeof old === "object") {
              return {
                ...old,
                pages: old?.pages?.map(item => {
                  return {
                    ...item,
                    data: item.data?.filter(
                      dataItem => dataItem?.id !== data?.data?.id,
                    ),
                  };
                }),
              };
            }
            return undefined;
          },
        );

        // Return a context object with the snapshotted value
        return { previousData };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (context: { previousData: BookmarksPaginatedDataTypes }) => {
        queryClient.setQueryData(
          [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID],
          context?.previousData,
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient
          .invalidateQueries([BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID])
          ?.catch(() => {});
        queryClient
          .invalidateQueries([BOOKMARKS_COUNT_KEY, session?.user?.id])
          ?.catch(() => {});
      },
    },
  );

  return { moveBookmarkToTrashOptimisticMutation };
}
