import { useRouter } from "next/router";
import { useCallback } from "react";

import find from "lodash/find";

import useDeleteCategoryOptimisticMutation from "../async/mutationHooks/category/useDeleteCategoryOptimisticMutation";
import useFetchCategories from "../async/queryHooks/category/use-fetch-categories";
import { useSupabaseSession } from "../store/componentStore";
import { mutationApiCall } from "../utils/apiHelpers";
import { EVERYTHING_URL } from "../utils/constants";
import { errorToast } from "../utils/toastMessages";

interface OnDeleteCollectionProps {
  categoryId: number;
  current: boolean;
  keepBookmarks?: boolean;
}

export const useDeleteCollection = () => {
  const router = useRouter();
  const session = useSupabaseSession((state) => state.session);

  const { allCategories } = useFetchCategories();
  const { deleteCategoryOptimisticMutation } = useDeleteCategoryOptimisticMutation();

  const onDeleteCollection = useCallback(
    async (props: OnDeleteCollectionProps) => {
      const { categoryId, current, keepBookmarks = false } = props;

      const currentCategory = find(allCategories, (item) => item?.id === categoryId);

      if (currentCategory?.user_id?.id !== session?.user?.id) {
        errorToast("Only collection owner can delete this collection");
        return;
      }

      // current - only push to home if user is deleting the category when user is currently in that category
      if (current) {
        await router.push(`/${EVERYTHING_URL}`);
      }

      const restoreRoute = async () => {
        if (current && currentCategory?.category_slug) {
          await router.push(`/${currentCategory.category_slug}`);
        }
      };

      try {
        // oxlint-disable-next-line no-unsafe-assignment -- mutationApiCall returns Promise<any>
        const response: { response?: { data?: { error?: string }; status?: number } } | undefined =
          await mutationApiCall(
            deleteCategoryOptimisticMutation.mutateAsync({
              category_id: categoryId,
              keep_bookmarks: keepBookmarks,
            }),
          );

        // v1 Axios-style callers still surface errors on a resolved value.
        if (response?.response?.data?.error) {
          await restoreRoute();
        }
      } catch {
        // ky (v2 api client) rejects on 4xx/5xx. The hook's onError has already
        // rolled back the cache; we just need to restore the route and toast.
        errorToast("Failed to delete collection");
        await restoreRoute();
      }
    },
    [allCategories, deleteCategoryOptimisticMutation, router, session],
  );

  return { onDeleteCollection };
};
