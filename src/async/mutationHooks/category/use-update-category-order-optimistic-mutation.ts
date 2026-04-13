import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { UpdateCategoryOrderOutputSchema } from "@/app/api/v2/category/update-category-order/schema";
import type { ProfilesTableTypes } from "@/types/apiTypes";
import type { z } from "zod";

import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { CATEGORIES_KEY, USER_PROFILE, V2_UPDATE_CATEGORY_ORDER_API } from "@/utils/constants";

type UpdateCategoryOrderResponse = z.infer<typeof UpdateCategoryOrderOutputSchema>;

export default function useUpdateCategoryOrderOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();

  const updateCategoryOrderMutation = useMutation({
    mutationFn: async (data: { order: number[] | null }) => {
      const response = await api
        .patch(V2_UPDATE_CATEGORY_ORDER_API, {
          json: { category_order: data.order },
        })
        .json<UpdateCategoryOrderResponse>();

      return response;
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: [USER_PROFILE, session?.user?.id],
      });
      await queryClient.cancelQueries({
        queryKey: [CATEGORIES_KEY, session?.user?.id],
      });

      const previousData = queryClient.getQueryData([USER_PROFILE, session?.user?.id]);

      const newOrder = data?.order;

      queryClient.setQueryData(
        [USER_PROFILE, session?.user?.id],
        (old: { data: ProfilesTableTypes[] } | undefined) =>
          ({
            ...old,

            data: old?.data?.map((item) => {
              if (item.id === session?.user?.id) {
                return {
                  ...item,
                  category_order: newOrder,
                };
              }

              return item;
            }),
          }) as { data: ProfilesTableTypes[] },
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData([USER_PROFILE, session?.user?.id], context?.previousData);
    },
  });

  return { updateCategoryOrderMutation };
}
