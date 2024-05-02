import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import { type ProfilesTableTypes } from "../../../types/apiTypes";
import {
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	USER_PROFILE,
} from "../../../utils/constants";
import { updateUserProfile } from "../../supabaseCrudHelpers";

// update user profile date optimistically
export default function useUpdateUserProfileOptimisticMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { sortBy } = useGetSortBy();

	const { category_id: CATEGORIES_ID } = useGetCurrentCategoryId();
	const updateUserProfileOptimisticMutation = useMutation(updateUserProfile, {
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries([USER_PROFILE, session?.user?.id]);

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				CATEGORIES_KEY,
				session?.user?.id,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[USER_PROFILE, session?.user?.id],
				(old: { data: ProfilesTableTypes[] } | undefined) =>
					({
						...old,
						data: old?.data?.map((item) => ({
							...item,
							bookmarks_view: data?.updateData?.bookmarks_view,
						})),
					}) as { data: ProfilesTableTypes[] },
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: ProfilesTableTypes }) => {
			queryClient.setQueryData(
				[USER_PROFILE, session?.user?.id],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: () => {
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
			// void queryClient.invalidateQueries([
			// 	BOOKMARKS_KEY,
			// 	session?.user?.id,
			// 	CATEGORIES_ID,
			// 	sortBy,
			// ]);
		},
	});
	return { updateUserProfileOptimisticMutation };
}
