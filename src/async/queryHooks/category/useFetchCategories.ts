import { useQuery } from "@tanstack/react-query";

import type { CategoriesData } from "../../../types/apiTypes";

import { useSupabaseSession } from "../../../store/componentStore";
import { CATEGORIES_KEY } from "../../../utils/constants";
import { fetchCategoriesData } from "../../supabaseCrudHelpers";

// fetchs user categories
export default function useFetchCategories(shouldFetch = true) {
  const session = useSupabaseSession((state) => state.session);

  const {
    data: allCategories,
    isFetching: isFetchingCategories,
    isLoading: isLoadingCategories,
  } = useQuery<{
    data: CategoriesData[] | null;
    error: Error;
  }>({
    enabled: shouldFetch,
    queryFn: () => fetchCategoriesData(),
    queryKey: [CATEGORIES_KEY, session?.user?.id],
  });

  return {
    allCategories,
    isFetchingCategories,
    isLoadingCategories,
  };
}
