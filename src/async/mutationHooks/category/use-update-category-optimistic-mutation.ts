"use client";

import { useQueryClient } from "@tanstack/react-query";
import { produce } from "immer";

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

			return produce(currentData, (draft) => {
				const category = draft.data.find(
					(item) => item.id === variables.category_id,
				);
				if (!category) {
					return;
				}

				const { updateData } = variables;
				if (updateData.category_name !== undefined) {
					category.category_name = updateData.category_name;
				}

				if (updateData.category_views !== undefined) {
					category.category_views =
						updateData.category_views as CategoriesData["category_views"];
				}

				if (updateData.icon !== undefined) {
					category.icon = updateData.icon;
				}

				if (updateData.icon_color !== undefined) {
					category.icon_color = updateData.icon_color;
				}

				if (updateData.is_public !== undefined) {
					category.is_public = updateData.is_public;
				}
			});
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
