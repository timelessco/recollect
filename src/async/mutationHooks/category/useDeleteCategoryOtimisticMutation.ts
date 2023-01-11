import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CategoriesData } from '../../../types/apiTypes';
import { CATEGORIES_KEY, USER_PROFILE } from '../../../utils/constants';
import { deleteUserCategory } from '../../supabaseCrudHelpers';

// deletes a category optimistically
export default function useDeleteCategoryOtimisticMutation() {
  const session = useSession();
  const queryClient = useQueryClient();

  const deleteCategoryOtimisticMutation = useMutation(deleteUserCategory, {
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
            data: old?.data?.filter((item) => item?.id !== data?.category_id),
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
      queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
    },
  });

  return { deleteCategoryOtimisticMutation };
}
