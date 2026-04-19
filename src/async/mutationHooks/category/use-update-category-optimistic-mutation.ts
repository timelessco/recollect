"use client";

import { useQueryClient } from "@tanstack/react-query";
import { produce } from "immer";

import type {
  UpdateUserCategoryInput,
  UpdateUserCategoryOutput,
} from "@/app/api/v2/category/update-user-category/schema";
import type { CategoriesData } from "@/types/apiTypes";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { CATEGORIES_KEY, V2_UPDATE_USER_CATEGORY_API } from "@/utils/constants";

export function useUpdateCategoryOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const queryKey = [CATEGORIES_KEY, session?.user?.id] as const;

  const updateCategoryOptimisticMutation = useReactQueryOptimisticMutation<
    UpdateUserCategoryOutput,
    Error,
    UpdateUserCategoryInput,
    typeof queryKey,
    CategoriesData[] | undefined
  >({
    mutationFn: (payload) =>
      api.post(V2_UPDATE_USER_CATEGORY_API, { json: payload }).json<UpdateUserCategoryOutput>(),
    onSettled: (_data, error) => {
      if (error) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
    },
    queryKey,
    showSuccessToast: false,
    updater: (currentData, variables) => {
      if (!currentData) {
        return currentData;
      }

      return produce(currentData, (draft) => {
        const category = draft.find((item) => item.id === variables.category_id);
        if (!category) {
          return;
        }

        const { updateData } = variables;
        if (updateData.category_name !== undefined) {
          category.category_name = updateData.category_name;
        }

        if (updateData.category_views !== undefined) {
          category.category_views = updateData.category_views as CategoriesData["category_views"];
        }

        if (updateData.icon !== undefined) {
          category.icon = updateData.icon;
        }

        if (updateData.icon_color !== undefined) {
          category.icon_color = updateData.icon_color;
        }

        if (updateData.is_public !== undefined) {
          category.is_public = updateData.is_public;
        }
      });
    },
  });

  return { updateCategoryOptimisticMutation };
}
