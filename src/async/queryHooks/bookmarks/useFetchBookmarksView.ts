import { useSession } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import useGetCurrentCategoryId from '../../../hooks/useGetCurrentCategoryId';
import { BOOKMARKS_VIEW } from '../../../utils/constants';
import { fetchBookmarksViews } from '../../supabaseCrudHelpers';

// fetchs bookmarks view
export default function useFetchBookmarksView() {
  const session = useSession();
  const { category_id } = useGetCurrentCategoryId();

  const { data } = useQuery([BOOKMARKS_VIEW, category_id], () =>
    fetchBookmarksViews({ category_id: category_id, session })
  );

  return { data };
}
