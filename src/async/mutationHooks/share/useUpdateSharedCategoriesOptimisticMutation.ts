import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import type { FetchSharedCategoriesData } from "../../../types/apiTypes";
import {
  BOOKMARKS_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  USER_PROFILE,
} from "../../../utils/constants";
import { updateSharedCategoriesUserAccess } from "../../supabaseCrudHelpers";

// updates shared cat data optimistically
export default function useUpdateSharedCategoriesOptimisticMutation() {
  const queryClient = useQueryClient();
  const session = useSession();
  const { category_id: CATEGORIES_ID } = useGetCurrentCategoryId();

  const updateSharedCategoriesOptimisticMutation = useMutation(
    updateSharedCategoriesUserAccess,
    {
      onMutate: async data => {
        // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        await queryClient.cancelQueries([USER_PROFILE, session?.user?.id]);

        // Snapshot the previous value
        const previousData = queryClient.getQueryData([
          SHARED_CATEGORIES_TABLE_NAME,
        ]);

        // Optimistically update to the new value
        queryClient.setQueryData(
          [SHARED_CATEGORIES_TABLE_NAME],
          (old: { data: FetchSharedCategoriesData[] } | undefined) => {
            return {
              ...old,
              data: old?.data?.map(item => {
                return {
                  ...item,
                  category_views: data?.updateData?.category_views,
                };
              }),
            } as { data: FetchSharedCategoriesData[] };
          },
        );

        // Return a context object with the snapshotted value
        return { previousData };
      },
      // If the mutation fails, use the context returned from onMutate to roll back
      onError: (context: { previousData: FetchSharedCategoriesData }) => {
        queryClient.setQueryData(
          [SHARED_CATEGORIES_TABLE_NAME],
          context?.previousData,
        );
      },
      // Always refetch after error or success:
      onSettled: () => {
        queryClient
          .invalidateQueries([SHARED_CATEGORIES_TABLE_NAME])
          ?.catch(() => {});
        queryClient
          .invalidateQueries([BOOKMARKS_KEY, session?.user?.id, CATEGORIES_ID])
          ?.catch(() => {});
      },
    },
  );

  return { updateSharedCategoriesOptimisticMutation };
}
