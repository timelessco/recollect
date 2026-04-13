import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateSharedCategoriesUserAccessApiPayload } from "../../../types/apiTypes";

import { api } from "../../../lib/api-helpers/api-v2";
import { useSupabaseSession } from "../../../store/componentStore";
import {
  CATEGORIES_KEY,
  SHARED_CATEGORIES_TABLE_NAME,
  V2_UPDATE_SHARED_CATEGORY_USER_ROLE_API,
} from "../../../utils/constants";

// updates shared cat user access
export default function useUpdateSharedCategoriesUserAccessMutation() {
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);

  const updateSharedCategoriesUserAccessMutation = useMutation({
    mutationFn: (payload: UpdateSharedCategoriesUserAccessApiPayload) =>
      api.patch(V2_UPDATE_SHARED_CATEGORY_USER_ROLE_API, { json: payload }).json(),
    onSuccess: () => {
      // Invalidate and refetch
      void queryClient.invalidateQueries({
        queryKey: [SHARED_CATEGORIES_TABLE_NAME],
      });
      void queryClient.invalidateQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });
    },
  });
  return { updateSharedCategoriesUserAccessMutation };
}
