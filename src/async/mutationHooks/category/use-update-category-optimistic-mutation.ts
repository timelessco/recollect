"use client";

import { useQueryClient } from "@tanstack/react-query";

import {
	type UpdateCategoryPayload,
	type UpdateCategoryResponse,
} from "@/app/api/category/update-user-category/schema";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { type CategoriesData } from "@/types/apiTypes";
import { CATEGORIES_KEY, UPDATE_USER_CATEGORIES_API } from "@/utils/constants";

export function useUpdateCategoryOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const queryKey = [CATEGORIES_KEY, session?.user?.id] as const;

	const updateCategoryOptimisticMutation = useReactQueryOptimisticMutation<
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

			const { updateData } = variables;

			return {
				...currentData,
				data: currentData.data.map((item) => {
					if (item.id !== variables.category_id) {
						return item;
					}

					return {
						...item,
						...(updateData.category_name !== undefined && {
							category_name: updateData.category_name,
						}),
						...(updateData.category_views !== undefined && {
							category_views:
								updateData.category_views as CategoriesData["category_views"],
						}),
						...(updateData.icon !== undefined && {
							icon: updateData.icon,
						}),
						...(updateData.icon_color !== undefined && {
							icon_color: updateData.icon_color,
						}),
						...(updateData.is_favorite !== undefined && {
							is_favorite: updateData.is_favorite,
						}),
						...(updateData.is_public !== undefined && {
							is_public: updateData.is_public,
						}),
					};
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

	return { updateCategoryOptimisticMutation };
}
