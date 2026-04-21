import { useQueryClient } from "@tanstack/react-query";
import { produce } from "immer";

import type {
  CreateUserCategoryInput,
  CreateUserCategoryOutput,
} from "@/app/api/v2/category/create-user-category/schema";
import type { CategoriesData } from "@/types/apiTypes";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import {
  BOOKMARKS_COUNT_KEY,
  CATEGORIES_KEY,
  USER_PROFILE,
  V2_CREATE_USER_CATEGORY_API,
} from "@/utils/constants";

export function useAddCategoryOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const queryKey = [CATEGORIES_KEY, session?.user?.id] as const;

  const addCategoryOptimisticMutation = useReactQueryOptimisticMutation<
    CreateUserCategoryOutput,
    Error,
    CreateUserCategoryInput,
    typeof queryKey,
    CategoriesData[] | undefined
  >({
    mutationFn: (payload) =>
      api.post(V2_CREATE_USER_CATEGORY_API, { json: payload }).json<CreateUserCategoryOutput>(),
    onSettled: (_data, error) => {
      if (error) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });
    },
    queryKey,
    showSuccessToast: true,
    successMessage: "Collection created",
    updater: (currentData, variables) => {
      if (!currentData) {
        return currentData;
      }

      // Negative id + `pending-` slug distinguish the placeholder from real DB rows
      // (positive ids, `${slug}-${uniqid}` slugs) so the sidebar's `item.id` key and
      // `/${item.category_slug}` href render stably until invalidation replaces it.
      const pendingMarker = -Date.now();
      const optimisticCategory = {
        category_name: variables.name,
        category_slug: `pending-${pendingMarker}`,
        icon: "star-04",
        icon_color: "#000000",
        id: pendingMarker,
        user_id: session?.user?.id,
      } as unknown as CategoriesData;

      return produce(currentData, (draft) => {
        draft.push(optimisticCategory);
      });
    },
  });

  return { addCategoryOptimisticMutation };
}
