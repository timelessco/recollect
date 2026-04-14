import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import {
  USER_PROFILE,
  USER_PROFILE_PIC,
  V2_REMOVE_PROFILE_PIC_API,
} from "../../../utils/constants";

export default function useRemoveUserProfilePicMutation() {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const removeProfilePic = useMutation({
    mutationFn: () => api.delete(V2_REMOVE_PROFILE_PIC_API, { json: {} }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE_PIC, session?.user?.email],
      });
    },
  });
  return { removeProfilePic };
}
