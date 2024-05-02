import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import { type BookmarksPaginatedDataTypes } from "../../../types/apiTypes";
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY } from "../../../utils/constants";
import { deleteData } from "../../supabaseCrudHelpers";

// dels bookmark optimistically
export default function useDeleteBookmarksOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { sortBy } = useGetSortBy();

	const deleteBookmarkOptismicMutation = useMutation(deleteData, {
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData<BookmarksPaginatedDataTypes>(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				(old) => {
					if (typeof old === "object") {
						return {
							...old,
							pages: old?.pages?.map((item) => ({
								...item,
								data: item.data?.filter(
									(dataItem) =>
										data.deleteData?.find(
											(findItem) => findItem?.id !== dataItem?.id,
										),
								),
							})),
						};
					}

					return undefined;
				},
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: BookmarksPaginatedDataTypes }) => {
			queryClient.setQueryData(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: () => {
			void queryClient.invalidateQueries([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);

			void queryClient.invalidateQueries([
				BOOKMARKS_COUNT_KEY,
				session?.user?.id,
			]);
		},
	});

	return { deleteBookmarkOptismicMutation };
}
