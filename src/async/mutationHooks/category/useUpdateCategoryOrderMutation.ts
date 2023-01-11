import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CATEGORIES_KEY, USER_PROFILE } from '../../../utils/constants';
import { updateCategoryOrder } from '../../supabaseCrudHelpers';

// add category to bookmark un-optimistically , used when creating a new category when editing a bookmark
export default function useUpdateCategoryOrderMutation() {
  const session = useSession();
  const queryClient = useQueryClient();
  const updateCategoryOrderMutation = useMutation(updateCategoryOrder, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);

      queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
    },
  });

  return { updateCategoryOrderMutation };
}
