import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BOOKMARKS_KEY } from '../../../utils/constants';
import { removeTagFromBookmark } from '../../supabaseCrudHelpers';

// add new tag for a user to add to bookmark
export default function useRemoveTagFromBookmarkMutation() {
  const queryClient = useQueryClient();
  const removeTagFromBookmarkMutation = useMutation(removeTagFromBookmark, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
    },
  });

  return { removeTagFromBookmarkMutation };
}
