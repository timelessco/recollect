import type { UpdateUserProfileOutputSchema } from "@/app/api/v2/profiles/update-user-profile/schema";
import type { ProfilesTableTypes } from "@/types/apiTypes";
import type { z } from "zod";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import { NEXT_API_URL, UPDATE_USER_PROFILE_API, USER_PROFILE } from "@/utils/constants";

interface UserProfileCache {
  data: null | ProfilesTableTypes[];
  error?: Error;
}

interface UpdateFavoriteOrderInput {
  favorite_categories: number[];
}

type UpdateFavoriteOrderResponse = z.infer<typeof UpdateUserProfileOutputSchema>;

export function useUpdateFavoriteOrderMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryKey = [USER_PROFILE, session?.user?.id] as const;

  const updateFavoriteOrderMutation = useReactQueryOptimisticMutation<
    UpdateFavoriteOrderResponse,
    Error,
    UpdateFavoriteOrderInput,
    typeof queryKey,
    undefined | UserProfileCache
  >({
    mutationFn: (payload) =>
      postApi<UpdateFavoriteOrderResponse>(`${NEXT_API_URL}${UPDATE_USER_PROFILE_API}`, {
        updateData: { favorite_categories: payload.favorite_categories },
      }),
    queryKey,
    updater: (currentData, variables) => {
      if (!currentData?.data) {
        logCacheMiss("Optimistic Update", "User profile cache missing", {
          userId: session?.user?.id,
        });
        return currentData;
      }

      return {
        ...currentData,
        data: currentData.data.map((profile) => {
          if (profile.id !== session?.user?.id) {
            return profile;
          }

          return {
            ...profile,
            favorite_categories: variables.favorite_categories,
          };
        }),
      };
    },
  });

  return { updateFavoriteOrderMutation };
}
