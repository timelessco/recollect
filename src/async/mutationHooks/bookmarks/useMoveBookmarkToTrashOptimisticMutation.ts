import { useMutation, useQueryClient } from "@tanstack/react-query";

import useDebounce from "../../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { type BookmarksPaginatedDataTypes } from "../../../types/apiTypes";
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY } from "../../../utils/constants";
import { moveBookmarkToTrash } from "../../supabaseCrudHelpers";

// move bookmark to trash optimistically
export default function useMoveBookmarkToTrashOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	const { sortBy } = useGetSortBy();

	const moveBookmarkToTrashOptimisticMutation = useMutation({
		mutationFn: moveBookmarkToTrash,
		onMutate: async (data) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});

			// Snapshot the previous value
			const previousData =
				queryClient.getQueryData<BookmarksPaginatedDataTypes>([
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
									(dataItem) => dataItem?.id !== data?.data?.id,
								),
							})),
						};
					}

					return undefined;
				},
			);

			// Optimistic update for search results
			let previousSearchData;
			if (debouncedSearch) {
				await queryClient.cancelQueries({
					queryKey: [
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						debouncedSearch,
					],
				});

				previousSearchData =
					queryClient.getQueryData<BookmarksPaginatedDataTypes>([
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						debouncedSearch,
					]);

				queryClient.setQueryData<BookmarksPaginatedDataTypes>(
					[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, debouncedSearch],
					(old) => {
						if (typeof old === "object") {
							return {
								...old,
								pages: old?.pages?.map((item) => ({
									...item,
									data: item.data?.filter(
										(dataItem) => dataItem?.id !== data?.data?.id,
									),
								})),
							};
						}

						return undefined;
					},
				);
			}

			// Return a context object with the snapshotted value
			return { previousData, previousSearchData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (
			_err,
			_variables,
			context?: {
				previousData: BookmarksPaginatedDataTypes | undefined;
				previousSearchData: BookmarksPaginatedDataTypes | undefined;
			},
		) => {
			if (context?.previousData) {
				queryClient.setQueryData(
					[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
					context.previousData,
				);
			}

			if (debouncedSearch && context?.previousSearchData) {
				queryClient.setQueryData(
					[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, debouncedSearch],
					context.previousSearchData,
				);
			}
		},
		// Always refetch after error or success:
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});
		},
	});

	return { moveBookmarkToTrashOptimisticMutation };
}
