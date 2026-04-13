import { useQuery } from "@tanstack/react-query";

import type { CategoriesData } from "../../../types/apiTypes";

import { api } from "../../../lib/api-helpers/api-v2";
import { useSupabaseSession } from "../../../store/componentStore";
import { CATEGORIES_KEY, V2_FETCH_USER_CATEGORIES_API } from "../../../utils/constants";

export default function useFetchCategories(shouldFetch = true) {
  const session = useSupabaseSession((state) => state.session);

  const {
    data: allCategories,
    isFetching: isFetchingCategories,
    isLoading: isLoadingCategories,
  } = useQuery({
    enabled: shouldFetch,
    queryFn: () => api.get(V2_FETCH_USER_CATEGORIES_API).json<CategoriesData[]>(),
    queryKey: [CATEGORIES_KEY, session?.user?.id],
  });

  return {
    allCategories,
    isFetchingCategories,
    isLoadingCategories,
  };
}
