import { useQueryClient } from "@tanstack/react-query";
import { produce } from "immer";

import {
	type CreateCategoryPayload,
	type CreateCategoryResponse,
} from "@/app/api/category/create-user-category/route";
import { useReactQueryOptimisticMutation } from "@/hooks/use-react-query-optimistic-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import { type CategoriesData } from "@/types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	CREATE_USER_CATEGORIES_API,
	USER_PROFILE,
} from "@/utils/constants";

export function useAddCategoryOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const queryKey = [CATEGORIES_KEY, session?.user?.id] as const;

	const addCategoryOptimisticMutation = useReactQueryOptimisticMutation<
		CreateCategoryResponse,
		Error,
		CreateCategoryPayload,
		typeof queryKey,
		{ data: CategoriesData[] } | undefined
	>({
		mutationFn: (payload) =>
			postApi<CreateCategoryResponse>(
				`/api${CREATE_USER_CATEGORIES_API}`,
				payload,
			),
		queryKey,
		updater: (currentData, variables) => {
			if (!currentData?.data) {
				return currentData;
			}

			// Optimistic placeholder - only includes fields needed for UI display.
			// Full data comes from server response after invalidation.
			const optimisticCategory = {
				category_name: variables.name,
				user_id: session?.user?.id,
				icon: "star-04",
				icon_color: "#000000",
			} as unknown as CategoriesData;

			return produce(currentData, (draft) => {
				draft.data.push(optimisticCategory);
			});
		},
		onSettled: (_data, error) => {
			if (error) {
				return;
			}

			void queryClient.invalidateQueries({
				queryKey: [CATEGORIES_KEY, session?.user?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: [USER_PROFILE, session?.user?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});
		},
		showSuccessToast: true,
		successMessage: "Collection created",
	});

	return { addCategoryOptimisticMutation };
}
