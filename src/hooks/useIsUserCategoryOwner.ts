import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";

import type { CategoriesData } from "../types/apiTypes";

import { useSupabaseSession } from "../store/componentStore";
import { CATEGORIES_KEY } from "../utils/constants";
import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

// tells if the logged in user is the category owner
export default function useIsUserCategoryOwner() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();
  const { category_id: categoryId } = useGetCurrentCategoryId();
  const userId = session?.user?.id;

  if (typeof categoryId !== "number") {
    // in this case user is in a non-catogory page like trash
    return { isOwner: true };
  }

  const categoryData = queryClient.getQueryData<{ data: CategoriesData[] }>([
    CATEGORIES_KEY,
    userId,
  ]);

  const isOwner =
    find(categoryData?.data, (item) => item?.id === categoryId)?.user_id?.id === userId;

  return { isOwner };
}
