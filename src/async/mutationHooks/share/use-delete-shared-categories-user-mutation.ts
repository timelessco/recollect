import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import {
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  V2_DELETE_SHARED_CATEGORIES_USER_API,
} from "../../../utils/constants";

export default function useDeleteSharedCategoriesUserMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const deleteSharedCategoriesUserMutation = useMutation({
    mutationFn: (payload: { id: number }) =>
      api.delete(V2_DELETE_SHARED_CATEGORIES_USER_API, { json: payload }).json(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [SHARED_CATEGORIES_TABLE_NAME],
      });
      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
    },
  });
  return { deleteSharedCategoriesUserMutation };
}
