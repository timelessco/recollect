import { useSession } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { SHARED_CATEGORIES_TABLE_NAME } from '../../../utils/constants';
import { fetchSharedCategoriesData } from '../../supabaseCrudHelpers';

// fetchs user shared categories
export default function useFetchSharedCategories() {
  const session = useSession();

  const { data: sharedCategoriesData } = useQuery(
    [SHARED_CATEGORIES_TABLE_NAME],
    () => fetchSharedCategoriesData(session)
  );

  return {
    sharedCategoriesData,
  };
}
