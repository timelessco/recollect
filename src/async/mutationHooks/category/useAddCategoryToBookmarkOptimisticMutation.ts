import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import isNull from 'lodash/isNull';
import useGetCurrentCategoryId from '../../../hooks/useGetCurrentCategoryId';
import { CategoriesData } from '../../../types/apiTypes';
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
} from '../../../utils/constants';
import { addCategoryToBookmark } from '../../supabaseCrudHelpers';

// adds cat to bookmark optimistically
export default function useAddCategoryToBookmarkOptimisticMutation() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { category_id } = useGetCurrentCategoryId();

  const addCategoryToBookmarkOptimisticMutation = useMutation(
    addCategoryToBookmark,
    {
      onMutate: async (data) => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);
        await queryClient.cancelQueries([
          BOOKMARKS_KEY,
          isNull(category_id) ? session?.user?.id : category_id,
        ]);

        const previousTodos = queryClient.getQueryData([
          BOOKMARKS_KEY,
          isNull(category_id) ? session?.user?.id : category_id,
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData(
          [
            BOOKMARKS_KEY,
            isNull(category_id) ? session?.user?.id : category_id,
          ],
          (old: { data: CategoriesData[] } | undefined) => {
            return {
              ...old,
              data: isNull(category_id)
                ? old?.data
                : old?.data?.filter((item) => item?.id !== data?.bookmark_id), // do not filter when user is in all-bookmarks page
            } as { data: CategoriesData[] };
          }
        );

        // Return a context object with the snapshotted value
        return { previousTodos };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (err, newTodo, context) => {
        queryClient.setQueryData(
          [CATEGORIES_KEY, session?.user?.id],
          context?.previousTodos
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
        queryClient.invalidateQueries([
          BOOKMARKS_KEY,
          session?.user?.id,
          category_id,
        ]);
        queryClient.invalidateQueries([BOOKMARKS_COUNT_KEY, session?.user?.id]);
      },
    }
  );

  return { addCategoryToBookmarkOptimisticMutation };
}
