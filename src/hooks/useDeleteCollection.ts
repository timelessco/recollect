import { useRouter } from "next/router";
import { useCallback } from "react";

import find from "lodash/find";

import useDeleteCategoryOptimisticMutation from "../async/mutationHooks/category/useDeleteCategoryOptimisticMutation";
import useFetchCategories from "../async/queryHooks/category/useFetchCategories";
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

      const currentCategory = find(allCategories?.data, (item) => item?.id === categoryId);

      if (currentCategory?.user_id?.id !== session?.user?.id) {
        errorToast("Only collection owner can delete this collection");
        return;
      }

      // current - only push to home if user is deleting the category when user is currently in that category
      if (current) {
        await router.push(`/${EVERYTHING_URL}`);
      }

      // oxlint-disable-next-line no-unsafe-assignment -- mutationApiCall returns Promise<any>
      const response: { response?: { data?: { error?: string }; status?: number } } | undefined =
        await mutationApiCall(
          deleteCategoryOptimisticMutation.mutateAsync({
            category_id: categoryId,
            keep_bookmarks: keepBookmarks,
          }),
        );

      // Check if mutation failed (error in response)
      // The API returns errors in response.response.data.error
      if (response?.response?.data?.error && current && currentCategory?.category_slug) {
        await router.push(`/${currentCategory.category_slug}`);
      }
    },
    [allCategories?.data, deleteCategoryOptimisticMutation, router, session],
  );

  return { onDeleteCollection };
};
