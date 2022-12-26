import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useGetCurrentCategoryId from '../../../hooks/useGetCurrentCategoryId';
import { CategoriesData } from '../../../types/apiTypes';
import { BOOKMARKS_KEY, CATEGORIES_KEY } from '../../../utils/constants';
import { updateCategory } from '../../supabaseCrudHelpers';

// updates a category optimistically
export default function useUpdateCategoryOptimisticMutation() {
  const session = useSession();
  const queryClient = useQueryClient();

  const { category_id } = useGetCurrentCategoryId();

  const updateCategoryOptimisticMutation = useMutation(updateCategory, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        CATEGORIES_KEY,
        session?.user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        (old: { data: CategoriesData[] } | undefined) => {
          return {
            ...old,
            data: old?.data?.map((item) => {
              if (item?.id === data?.category_id) {
                return {
                  ...item,
                  category_views: data?.updateData?.category_views,
                  icon: data?.updateData?.icon
                    ? data?.updateData?.icon
                    : item?.icon,
                  is_public:
                    data?.updateData?.is_public !== undefined
                      ? data?.updateData?.is_public
                      : item?.is_public,
                };
              } else {
                return item;
              }
            }),
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
    },
  });

  return { updateCategoryOptimisticMutation };
}
