import { useSession } from '@supabase/auth-helpers-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY } from '../../../utils/constants';
import { clearBookmarksInTrash } from '../../supabaseCrudHelpers';

// clears trash
export default function useClearBookmarksInTrashMutation() {
  const session = useSession();
  const queryClient = useQueryClient();

  const clearBookmarksInTrashMutation = useMutation(clearBookmarksInTrash, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
      queryClient.invalidateQueries([BOOKMARKS_COUNT_KEY, session?.user?.id]);
    },
  });

  return { clearBookmarksInTrashMutation };
}
