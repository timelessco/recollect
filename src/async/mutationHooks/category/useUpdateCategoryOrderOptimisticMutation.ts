import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import {
	type CategoriesData,
	type ProfilesTableTypes,
} from "../../../types/apiTypes";
import { CATEGORIES_KEY, USER_PROFILE } from "../../../utils/constants";
import { updateCategoryOrder } from "../../supabaseCrudHelpers";

// update collection order optimistically
export default function useUpdateCategoryOrderOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const updateCategoryOrderMutation = useMutation(updateCategoryOrder, {
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries([USER_PROFILE, session?.user?.id]);
			await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				USER_PROFILE,
				session?.user?.id,
			]);

			const newOrder = data?.order;

			// Optimistically update to the new value
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
							} else {
								return item;
							}
						}),
					}) as { data: ProfilesTableTypes[] },
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: CategoriesData }) => {
			queryClient.setQueryData(
				[USER_PROFILE, session?.user?.id],
				context?.previousData,
			);
		},
	});

	return { updateCategoryOrderMutation };
}
