import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type ProfilesTableTypes } from "../../../types/apiTypes";
import { USER_PROFILE } from "../../../utils/constants";
import { updateUserProfile } from "../../supabaseCrudHelpers";

// update user profile date optimistically
export default function useUpdateUserProfileOptimisticMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);

	const updateUserProfileOptimisticMutation = useMutation({
		mutationFn: updateUserProfile,
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({
				queryKey: [USER_PROFILE, session?.user?.id],
			});

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				USER_PROFILE,
				session?.user?.id,
			]);
			// Optimistically update to the new value
			if (data?.updateData?.bookmarks_view !== undefined) {
				queryClient.setQueryData(
					[USER_PROFILE, session?.user?.id],
					(old: { data: ProfilesTableTypes[] } | undefined) => {
						if (!old?.data) {
							return old;
						}

						return {
							...old,
							data: old.data.map((item) => ({
								...item,
								...(item.bookmarks_view !== data.updateData.bookmarks_view && {
									bookmarks_view: data.updateData.bookmarks_view,
								}),
							})),
						};
					},
				);
			}

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
			void queryClient.invalidateQueries({
				queryKey: [USER_PROFILE, session?.user?.id],
			});
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
