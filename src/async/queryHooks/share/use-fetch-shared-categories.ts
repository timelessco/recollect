import { useQuery } from "@tanstack/react-query";

import type { FetchSharedCategoriesData } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import {
  SHARED_CATEGORIES_TABLE_NAME,
  V2_FETCH_SHARED_CATEGORIES_DATA_API,
} from "@/utils/constants";

export default function useFetchSharedCategories() {
  const { data: sharedCategoriesData } = useQuery({
    queryFn: () => api.get(V2_FETCH_SHARED_CATEGORIES_DATA_API).json<FetchSharedCategoriesData[]>(),
    queryKey: [SHARED_CATEGORIES_TABLE_NAME],
  });

  return {
    sharedCategoriesData,
  };
}
