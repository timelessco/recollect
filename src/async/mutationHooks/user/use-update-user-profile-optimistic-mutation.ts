import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { AiFeaturesToggle, ProfilesBookmarksView, ProfilesTableTypes } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { USER_PROFILE, V2_UPDATE_USER_PROFILE_API } from "@/utils/constants";

interface UpdateUserProfilePayload {
  updateData: {
    ai_features_toggle?: AiFeaturesToggle;
    bookmarks_view?: ProfilesBookmarksView;
    display_name?: null | string;
    email?: null | string;
    provider?: null | string;
  };
}

export default function useUpdateUserProfileOptimisticMutation() {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);

  const updateUserProfileOptimisticMutation = useMutation({
    mutationFn: async (data: UpdateUserProfilePayload) => {
      const response = await api
        .patch(V2_UPDATE_USER_PROFILE_API, {
          json: { updateData: data.updateData },
        })
        .json<ProfilesTableTypes[]>();

      return response;
    },
    onMutate: async (data) => {
      const queryKey = [USER_PROFILE, session?.user?.id] as const;
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ProfilesTableTypes[]>(queryKey);
      // Optimistically update to the new value
      if (data?.updateData?.bookmarks_view !== undefined) {
        queryClient.setQueryData<ProfilesTableTypes[]>(queryKey, (old) => {
          if (!old) {
            return old;
          }

          return old.map((item) => ({
            ...item,
            ...(item.bookmarks_view !== data.updateData.bookmarks_view && {
              bookmarks_view: data.updateData.bookmarks_view,
            }),
          }));
        });
      }

      if (data?.updateData?.ai_features_toggle !== undefined) {
        queryClient.setQueryData<ProfilesTableTypes[]>(queryKey, (old) => {
          if (!old) {
            return old;
          }

          return old.map((item) => ({
            ...item,
            ai_features_toggle: {
              ...item.ai_features_toggle,
              ...data.updateData.ai_features_toggle,
            },
          }));
        });
      }

      return { previousData, queryKey };
    },
    // Use queryKey captured in onMutate so rollback/invalidation target the same
    // cache entry even if session changes mid-flight.
    onError: (_error, _variables, context) => {
      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.queryKey) {
        void queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
    },
  });
  return { updateUserProfileOptimisticMutation };
}
