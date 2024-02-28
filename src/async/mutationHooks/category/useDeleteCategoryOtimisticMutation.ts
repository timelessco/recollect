import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type CategoriesData } from "../../../types/apiTypes";
import { CATEGORIES_KEY, USER_PROFILE } from "../../../utils/constants";
import { deleteUserCategory } from "../../supabaseCrudHelpers";

// deletes a category optimistically
export default function useDeleteCategoryOtimisticMutation() {
	const session = useSession();
	const queryClient = useQueryClient();

	const deleteCategoryOtimisticMutation = useMutation(deleteUserCategory, {
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				CATEGORIES_KEY,
				session?.user?.id,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[CATEGORIES_KEY, session?.user?.id],
				(old: { data: CategoriesData[] } | undefined) =>
					({
						...old,
						data: old?.data?.filter((item) => item?.id !== data?.category_id),
					}) as { data: CategoriesData[] },
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: CategoriesData }) => {
			queryClient.setQueryData(
				[CATEGORIES_KEY, session?.user?.id],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: () => {
			void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
		},
	});

	return { deleteCategoryOtimisticMutation };
}
