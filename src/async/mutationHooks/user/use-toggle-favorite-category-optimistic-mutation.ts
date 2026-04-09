import type { ToggleFavoriteCategoryResponse } from "@/app/api/profiles/toggle-favorite-category/route";
import type { ProfilesTableTypes } from "@/types/apiTypes";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import { NEXT_API_URL, TOGGLE_FAVORITE_CATEGORY_API, USER_PROFILE } from "@/utils/constants";

interface UserProfileCache {
  data: null | ProfilesTableTypes[];
  error?: Error;
}

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
    undefined | UserProfileCache
  >({
    mutationFn: (payload) =>
      postApi<ToggleFavoriteCategoryResponse>(`${NEXT_API_URL}${TOGGLE_FAVORITE_CATEGORY_API}`, {
        category_id: payload.category_id,
      }),
    queryKey,
    updater: (currentData, variables) => {
      if (!currentData?.data) {
        logCacheMiss("Optimistic Update", "User profile cache missing", {
          userId: session?.user?.id,
        });
        return currentData;
      }

      const { category_id } = variables;

      return {
        ...currentData,
        data: currentData.data.map((profile) => {
          if (profile.id !== session?.user?.id) {
            return profile;
          }

          const existingFavorites = profile.favorite_categories ?? [];

          return {
            ...profile,
            favorite_categories: toggleIdInArray(existingFavorites, category_id),
          };
        }),
      };
    },
  });

  return { toggleFavoriteCategoryOptimisticMutation };
}
