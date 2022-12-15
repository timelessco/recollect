import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  USER_PROFILE,
} from '../../../utils/constants';
import { updateUserProfile } from '../../supabaseCrudHelpers';
import { useSession } from '@supabase/auth-helpers-react';
import { ProfilesTableTypes } from '../../../types/apiTypes';
import useGetCurrentCategoryId from '../../../hooks/useGetCurrentCategoryId';

// update user profile date optimistically
export default function useUpdateUserProfileOptimisticMutation() {
  const queryClient = useQueryClient();
  const session = useSession();

  const { category_id } = useGetCurrentCategoryId();
  const updateUserProfileOptimisticMutation = useMutation(updateUserProfile, {
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries([USER_PROFILE, session?.user?.id]);

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData([
        CATEGORIES_KEY,
        session?.user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [USER_PROFILE, session?.user?.id],
        (old: { data: ProfilesTableTypes[] } | undefined) => {
          return {
            ...old,
            data: old?.data?.map((item) => {
              return {
                ...item,
                bookmarks_view: data?.updateData?.bookmarks_view,
              };
            }),
          } as { data: ProfilesTableTypes[] };
        }
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        [USER_PROFILE, session?.user?.id],
        context?.previousTodos
      );
    },
    // Always refetch after error or success:
    onSettled: () => {
      queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
      queryClient.invalidateQueries([
        BOOKMARKS_KEY,
        session?.user?.id,
        category_id,
      ]);
    },
  });
  return { updateUserProfileOptimisticMutation };
}
