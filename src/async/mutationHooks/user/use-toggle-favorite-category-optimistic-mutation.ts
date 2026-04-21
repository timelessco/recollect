import type { ToggleFavoriteCategoryOutputSchema } from "@/app/api/v2/profiles/toggle-favorite-category/schema";
import type { ProfilesTableTypes } from "@/types/apiTypes";
import type { z } from "zod";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import { USER_PROFILE, V2_TOGGLE_FAVORITE_CATEGORY_API } from "@/utils/constants";

type ToggleFavoriteCategoryResponse = z.infer<typeof ToggleFavoriteCategoryOutputSchema>;

interface ToggleFavoriteCategoryInput {
  category_id: number;
}

function toggleIdInArray(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((existingId) => existingId !== id) : [...ids, id];
}

export function useToggleFavoriteCategoryOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryKey = [USER_PROFILE, session?.user?.id] as const;

  const toggleFavoriteCategoryOptimisticMutation = useReactQueryOptimisticMutation<
    ToggleFavoriteCategoryResponse,
    Error,
    ToggleFavoriteCategoryInput,
    typeof queryKey,
    ProfilesTableTypes[] | undefined
  >({
    mutationFn: async (payload) => {
      const response = await api
        .post(V2_TOGGLE_FAVORITE_CATEGORY_API, {
          json: { category_id: payload.category_id },
        })
        .json<ToggleFavoriteCategoryResponse>();
      return response;
    },
    queryKey,
    updater: (currentData, variables) => {
      if (!currentData) {
        logCacheMiss("Optimistic Update", "User profile cache missing", {
          userId: session?.user?.id,
        });
        return currentData;
      }

      const { category_id } = variables;

      return currentData.map((profile) => {
        if (profile.id !== session?.user?.id) {
          return profile;
        }

        const existingFavorites = profile.favorite_categories ?? [];

        return {
          ...profile,
          favorite_categories: toggleIdInArray(existingFavorites, category_id),
        };
      });
    },
  });

  return { toggleFavoriteCategoryOptimisticMutation };
}
