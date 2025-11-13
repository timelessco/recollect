import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type CategoriesData } from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	CATEGORIES_KEY,
	USER_PROFILE,
} from "../../../utils/constants";
import { addUserCategory } from "../../supabaseCrudHelpers";

// adds new category optimistically
export default function useAddCategoryOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const addCategoryOptimisticMutation = useMutation({
		mutationFn: addUserCategory,
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({
				queryKey: [CATEGORIES_KEY, session?.user?.id],
			});

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				CATEGORIES_KEY,
				session?.user?.id,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[CATEGORIES_KEY, session?.user?.id],
				(old: { data: CategoriesData[] } | undefined) => {
					if (typeof old === "object") {
						return {
							...old,
							data: [
								...old.data,
								{
									category_name: data?.name,
									user_id: session?.user?.id,
									icon: "star-04",
									icon_color: "#000000",
								},
							],
						} as { data: CategoriesData[] };
					}

					return undefined;
				},
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: CategoriesData[] }) => {
			queryClient.setQueryData(
				[CATEGORIES_KEY, session?.user?.id],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: () => {
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
	});

	return { addCategoryOptimisticMutation };
}
