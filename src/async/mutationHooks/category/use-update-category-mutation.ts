"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
	type UpdateCategoryPayload,
	type UpdateCategoryResponse,
} from "@/app/api/category/update-user-category/route";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { type CategoriesData } from "@/types/apiTypes";
import { CATEGORIES_KEY, UPDATE_USER_CATEGORIES_API } from "@/utils/constants";

export function useUpdateCategoryMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const queryKey = [CATEGORIES_KEY, session?.user?.id] as const;

	const updateCategoryMutation = useReactQueryOptimisticMutation<
		UpdateCategoryResponse,
		Error,
		UpdateCategoryPayload,
		typeof queryKey,
		{ data: CategoriesData[] } | undefined
	>({
		mutationFn: (payload) =>
			postApi<UpdateCategoryResponse>(
				`/api${UPDATE_USER_CATEGORIES_API}`,
				payload,
			),
		queryKey,
		updater: (currentData, variables) => {
			if (!currentData?.data) {
				return currentData;
			}

			return {
				...currentData,
				data: currentData.data.map((item) => {
					if (item.id === variables.category_id) {
						return {
							...item,
							...(variables.updateData.category_name !== undefined && {
								category_name: variables.updateData.category_name,
							}),
							...(variables.updateData.category_views !== undefined && {
								category_views: variables.updateData
									.category_views as CategoriesData["category_views"],
							}),
							...(variables.updateData.icon !== undefined && {
								icon: variables.updateData.icon,
							}),
							...(variables.updateData.icon_color !== undefined && {
								icon_color: variables.updateData.icon_color,
							}),
							...(variables.updateData.is_public !== undefined && {
								is_public: variables.updateData.is_public,
							}),
						};
					}

					return item;
				}),
			};
		},
		onSettled: (_data, error) => {
			if (error) {
				return;
			}

			void queryClient.invalidateQueries({
				queryKey: [CATEGORIES_KEY, session?.user?.id],
			});
		},
		showSuccessToast: false,
	});

	return { updateCategoryMutation };
}
