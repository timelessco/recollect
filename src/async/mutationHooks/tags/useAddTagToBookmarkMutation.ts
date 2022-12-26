import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BOOKMARKS_KEY } from '../../../utils/constants';
import { addTagToBookmark } from '../../supabaseCrudHelpers';

// add tag to a bookmark
export default function useAddTagToBookmarkMutation() {
  const queryClient = useQueryClient();
  const addTagToBookmarkMutation = useMutation(addTagToBookmark, {
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries([BOOKMARKS_KEY]);
    },
  });
  return { addTagToBookmarkMutation };
}
