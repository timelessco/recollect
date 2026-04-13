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
      await queryClient.cancelQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });

      const previousData = queryClient.getQueryData([USER_PROFILE, session?.user?.id]);

      if (data?.updateData?.bookmarks_view !== undefined) {
        queryClient.setQueryData(
          [USER_PROFILE, session?.user?.id],
          (old: { data: ProfilesTableTypes[] } | undefined) => {
            if (!old?.data) {
              return old;
            }

            return {
              ...old,
              data: old.data.map((item) => ({
                ...item,
                ...(item.bookmarks_view !== data.updateData.bookmarks_view && {
                  bookmarks_view: data.updateData.bookmarks_view,
                }),
              })),
            };
          },
        );
      }

      if (data?.updateData?.ai_features_toggle !== undefined) {
        queryClient.setQueryData(
          [USER_PROFILE, session?.user?.id],
          (old: { data: ProfilesTableTypes[] } | undefined) => {
            if (!old?.data) {
              return old;
            }

            return {
              ...old,
              data: old.data.map((item) => ({
                ...item,
                ai_features_toggle: {
                  ...item.ai_features_toggle,
                  ...data.updateData.ai_features_toggle,
                },
              })),
            };
          },
        );
      }

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData([USER_PROFILE, session?.user?.id], context?.previousData);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
    },
  });
  return { updateUserProfileOptimisticMutation };
}
