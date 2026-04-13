import type { UpdateUserProfileOutputSchema } from "@/app/api/v2/profiles/update-user-profile/schema";
import type { ProfilesTableTypes } from "@/types/apiTypes";
import type { z } from "zod";

import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { logCacheMiss } from "@/utils/cache-debug-helpers";
import { USER_PROFILE, V2_UPDATE_USER_PROFILE_API } from "@/utils/constants";

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
    ProfilesTableTypes[] | undefined
  >({
    mutationFn: async (payload) => {
      const response = await api
        .patch(V2_UPDATE_USER_PROFILE_API, {
          json: { updateData: { favorite_categories: payload.favorite_categories } },
        })
        .json<UpdateFavoriteOrderResponse>();

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

      return currentData.map((profile) => {
        if (profile.id !== session?.user?.id) {
          return profile;
        }

        return {
          ...profile,
          favorite_categories: variables.favorite_categories,
        };
      });
    },
  });

  return { updateFavoriteOrderMutation };
}
