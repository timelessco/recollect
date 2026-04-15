import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import { CATEGORIES_KEY, USER_PROFILE, V2_DELETE_USER_API } from "../../../utils/constants";

export default function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const deleteUserMutation = useMutation({
    mutationFn: () => api.post(V2_DELETE_USER_API, { json: {} }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
    },
  });
  return { deleteUserMutation };
}
