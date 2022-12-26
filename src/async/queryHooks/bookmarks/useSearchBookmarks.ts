import { useSession } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import useDebounce from '../../../hooks/useDebounce';
import useGetCurrentCategoryId from '../../../hooks/useGetCurrentCategoryId';
import { useMiscellaneousStore } from '../../../store/componentStore';
import { BOOKMARKS_KEY } from '../../../utils/constants';
import { searchBookmarks } from '../../supabaseCrudHelpers';

// searches bookmarks
export default function useSearchBookmarks() {
  const session = useSession();
  const searchText = useMiscellaneousStore((state) => state.searchText);

  const debouncedSearch = useDebounce(searchText, 500);

  const { category_id } = useGetCurrentCategoryId();

  const { data } = useQuery(
    [BOOKMARKS_KEY, session?.user?.id, category_id, debouncedSearch],
    async () => searchBookmarks(searchText, category_id, session)
  );

  return { data };
}
