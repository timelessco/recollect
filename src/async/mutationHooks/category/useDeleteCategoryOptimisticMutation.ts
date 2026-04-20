import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CategoriesData, DeleteUserCategoryApiPayload } from "../../../types/apiTypes";
import type { DeleteUserCategoryOutput } from "@/app/api/v2/category/delete-user-category/schema";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  USER_PROFILE,
  V2_DELETE_USER_CATEGORY_API,
} from "../../../utils/constants";

// deletes a category optimistically
export default function useDeleteCategoryOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const deleteCategoryOptimisticMutation = useMutation({
    mutationFn: (payload: DeleteUserCategoryApiPayload) =>
      api.post(V2_DELETE_USER_CATEGORY_API, { json: payload }).json<DeleteUserCategoryOutput>(),
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<CategoriesData[]>([
        CATEGORIES_KEY,
        session?.user?.id,
      ]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        [CATEGORIES_KEY, session?.user?.id],
        (old: CategoriesData[] | undefined) =>
          old?.filter((item) => item?.id !== data?.category_id) ?? [],
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (
      _error,
      _variables,
      context: { previousData: CategoriesData[] | undefined } | undefined,
    ) => {
      queryClient.setQueryData([CATEGORIES_KEY, session?.user?.id], context?.previousData);
    },
    // Always refetch after error or success:
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });
    },
  });

  return { deleteCategoryOptimisticMutation };
}
