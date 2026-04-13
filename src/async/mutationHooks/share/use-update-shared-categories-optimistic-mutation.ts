import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  FetchSharedCategoriesData,
  UpdateSharedCategoriesUserAccessApiPayload,
} from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { api } from "../../../lib/api-helpers/api-v2";
import { useSupabaseSession } from "../../../store/componentStore";
import {
  BOOKMARKS_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  USER_PROFILE,
  V2_UPDATE_SHARED_CATEGORY_USER_ROLE_API,
} from "../../../utils/constants";

// updates shared cat data optimistically
export default function useUpdateSharedCategoriesOptimisticMutation() {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const { category_id: CATEGORIES_ID } = useGetCurrentCategoryId();
  const { sortBy } = useGetSortBy();

  const updateSharedCategoriesOptimisticMutation = useMutation({
    mutationFn: (payload: UpdateSharedCategoriesUserAccessApiPayload) =>
      api.patch(V2_UPDATE_SHARED_CATEGORY_USER_ROLE_API, { json: payload }).json(),
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([SHARED_CATEGORIES_TABLE_NAME]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [SHARED_CATEGORIES_TABLE_NAME],
        (old: { data: FetchSharedCategoriesData[] } | undefined) =>
          ({
            ...old,

            data: old?.data?.map((item) => ({
              ...item,
              category_views: data?.updateData?.category_views,
            })),
          }) as { data: FetchSharedCategoriesData[] },
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (context: { previousData: FetchSharedCategoriesData }) => {
      queryClient.setQueryData([SHARED_CATEGORIES_TABLE_NAME], context?.previousData);
    },
    // Always refetch after error or success:
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [SHARED_CATEGORIES_TABLE_NAME],
      });
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORIES_ID, sortBy],
      });
    },
  });

  return { updateSharedCategoriesOptimisticMutation };
}
