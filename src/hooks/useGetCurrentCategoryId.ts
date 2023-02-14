import { useSession } from "@supabase/auth-helpers-react";
import type { PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";

import type { CategoriesData } from "../types/apiTypes";
import type { CategoryIdUrlTypes } from "../types/componentTypes";
import { CATEGORIES_KEY } from "../utils/constants";
import { getCategoryIdFromSlug } from "../utils/helpers";

// gets current category ID that user is in
export default function useGetCurrentCategoryId() {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

  const allCategories = queryClient.getQueryData([
    CATEGORIES_KEY,
    session?.user?.id,
  ]) as {
    data: CategoriesData[];
    error: PostgrestError;
  };

  const categorySlug = router?.asPath?.split("/")[1] || null;
  // disabling here as everywhere else is correct case
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const category_id =
    getCategoryIdFromSlug(categorySlug, allCategories?.data) || null;

  return { category_id } as { category_id: CategoryIdUrlTypes };
}
