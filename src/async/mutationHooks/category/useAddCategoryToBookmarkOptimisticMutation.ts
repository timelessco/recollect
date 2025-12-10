import { useMutation, useQueryClient } from "@tanstack/react-query";
import isNull from "lodash/isNull";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { type CategoriesData } from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
} from "../../../utils/constants";
import { addCategoryToBookmark } from "../../supabaseCrudHelpers";

import useDebounce from "@/hooks/useDebounce";

// adds cat to bookmark optimistically
export default function useAddCategoryToBookmarkOptimisticMutation(
	isLightbox = false,
) {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const { sortBy } = useGetSortBy();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	const setSidePaneOptionLoading = useLoadersStore(
		(state) => state.setSidePaneOptionLoading,
	);

	const addCategoryToBookmarkOptimisticMutation = useMutation({
		mutationFn: addCategoryToBookmark,
		onMutate: async (data) => {
			setSidePaneOptionLoading(data?.category_id);

			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({
				queryKey: [CATEGORIES_KEY, session?.user?.id],
			});
			await queryClient.cancelQueries({
				queryKey: [
					BOOKMARKS_KEY,
					isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID,
				],
			});

			const previousData = queryClient.getQueryData([
				BOOKMARKS_KEY,
				isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID,
			]);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[BOOKMARKS_KEY, isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID],
				(old: { data: CategoriesData[] } | undefined) =>
					({
						...old,

						// do not filter when user is in everything page
						data: isNull(CATEGORY_ID)
							? old?.data
							: old?.data?.filter((item) => item?.id !== data?.bookmark_id),
					}) as { data: CategoriesData[] },
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: CategoriesData }) => {
			queryClient.setQueryData(
				[BOOKMARKS_KEY, isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID],
				context?.previousData,
			);
		},
		// Always refetch after error or success:
		onSettled: async (_data, _error, variables) => {
			try {
				// Invalidate the destination collection (where the bookmark is being moved to)
				if (variables?.category_id) {
					void queryClient.invalidateQueries({
						queryKey: [
							BOOKMARKS_KEY,
							session?.user?.id,
							variables.category_id,
							sortBy,
						],
					});
				}

				if (!isLightbox) {
					void queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
					});
					void queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
					});
					if (debouncedSearch) {
						void queryClient.invalidateQueries({
							queryKey: [
								BOOKMARKS_KEY,
								session?.user?.id,
								CATEGORY_ID,
								debouncedSearch,
							],
						});
					}
				}
			} finally {
				setSidePaneOptionLoading(null);
			}
		},
	});

	return { addCategoryToBookmarkOptimisticMutation };
}
