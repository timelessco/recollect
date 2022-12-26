import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { USER_TAGS_KEY } from '../../../utils/constants';
import { addUserTags } from '../../supabaseCrudHelpers';

// add new tag for a user to add to bookmark
export default function useAddUserTagsMutation() {
  const session = useSession();
  const queryClient = useQueryClient();
  const addUserTagsMutation = useMutation(addUserTags, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([USER_TAGS_KEY, session?.user?.id]);
    },
  });

  return { addUserTagsMutation };
}
