import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ProfilesTableTypes } from "../../../types/apiTypes";

import { useSupabaseSession } from "../../../store/componentStore";
import { CATEGORIES_KEY, USER_PROFILE } from "../../../utils/constants";
import { updateCategoryOrder } from "../../supabaseCrudHelpers";

// update collection order optimistically
export default function useUpdateCategoryOrderOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const updateCategoryOrderMutation = useMutation({
    mutationFn: updateCategoryOrder,
    onMutate: async (data) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      await queryClient.cancelQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ProfilesTableTypes[]>([
        USER_PROFILE,
        session?.user?.id,
      ]);

      const newOrder = data?.order;

      // Optimistically update to the new value
      queryClient.setQueryData<ProfilesTableTypes[]>([USER_PROFILE, session?.user?.id], (old) =>
        old?.map((item) => {
          if (item.id === session?.user?.id) {
            return {
              ...item,
              category_order: newOrder,
            };
          }

          return item;
        }),
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_error, _variables, context) => {
      queryClient.setQueryData([USER_PROFILE, session?.user?.id], context?.previousData);
    },
  });

  return { updateCategoryOrderMutation };
}
