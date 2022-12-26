import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useGetCurrentCategoryId from '../../../hooks/useGetCurrentCategoryId';
import { BookmarksPaginatedDataTypes } from '../../../types/apiTypes';
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY } from '../../../utils/constants';
import { moveBookmarkToTrash } from '../../supabaseCrudHelpers';

// move bookmark to trash optimistically
export default function useMoveBookmarkToTrashOptimisticMutation() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { category_id } = useGetCurrentCategoryId();

  const moveBookmarkToTrashOptimisticMutation = useMutation(
    moveBookmarkToTrash,
    {
      onMutate: async (data) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);

        // Snapshot the previous value
        const previousTodos = queryClient.getQueryData([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData<BookmarksPaginatedDataTypes>(
          [BOOKMARKS_KEY, session?.user?.id, category_id],
          (old) => {
            if (typeof old === 'object') {
              return {
                ...old,
                pages: old?.pages?.map((item) => {
                  return {
                    ...item,
                    data: item.data?.filter(
                      (item) => item?.id !== data?.data?.id
                    ),
                  };
                }),
              };
            }
          }
        );

        // Return a context object with the snapshotted value
        return { previousTodos };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (err, newTodo, context) => {
        queryClient.setQueryData(
          [BOOKMARKS_KEY, session?.user?.id, category_id],
          context?.previousTodos
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient.invalidateQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);
        queryClient.invalidateQueries([BOOKMARKS_COUNT_KEY, session?.user?.id]);
      },
    }
  );

  return { moveBookmarkToTrashOptimisticMutation };
}
