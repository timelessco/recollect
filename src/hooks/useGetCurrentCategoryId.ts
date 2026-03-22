import { useRouter } from "next/router";

import { useQueryClient } from "@tanstack/react-query";

import type { CategoriesData } from "../types/apiTypes";
import type { CategoryIdUrlTypes } from "../types/componentTypes";

import { useSupabaseSession } from "../store/componentStore";
import { CATEGORIES_KEY } from "../utils/constants";
import { getCategoryIdFromSlug } from "../utils/helpers";
import { getCategorySlugFromRouter } from "../utils/url";

// gets current category ID that user is in
export default function useGetCurrentCategoryId() {
  const session = useSupabaseSession((state) => state.session);
  const router = useRouter();
  const queryClient = useQueryClient();

  const allCategories = queryClient.getQueryData<{ data: CategoriesData[] }>([
    CATEGORIES_KEY,
    session?.user?.id,
  ]);

  const categorySlug = getCategorySlugFromRouter(router);
  // disabling here as everywhere else is correct case
  const category_id = getCategoryIdFromSlug(categorySlug, allCategories?.data) ?? null;

  return { category_id } as { category_id: CategoryIdUrlTypes };
}
