import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import { CATEGORIES_KEY, USER_PROFILE, V2_UPDATE_USERNAME_API } from "../../../utils/constants";

export default function useUpdateUsernameMutation() {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const updateUsernameMutation = useMutation({
    mutationFn: (payload: { username: string }) =>
      api.patch(V2_UPDATE_USERNAME_API, { json: payload }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
    },
  });
  return { updateUsernameMutation };
}
