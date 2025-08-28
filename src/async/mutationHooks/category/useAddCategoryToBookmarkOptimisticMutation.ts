import { type PostgrestError } from "@supabase/supabase-js";
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
import { searchSlugKey } from "../../../utils/helpers";
import { addCategoryToBookmark } from "../../supabaseCrudHelpers";

// adds cat to bookmark optimistically
export default function useAddCategoryToBookmarkOptimisticMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const { sortBy } = useGetSortBy();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const searchText = useMiscellaneousStore((state) => state.searchText);

	const setSidePaneOptionLoading = useLoadersStore(
		(state) => state.setSidePaneOptionLoading,
	);

	const addCategoryToBookmarkOptimisticMutation = useMutation(
		addCategoryToBookmark,
		{
			onMutate: async (data) => {
				setSidePaneOptionLoading(data?.category_id);

				// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
				await queryClient.cancelQueries([CATEGORIES_KEY, session?.user?.id]);
				await queryClient.cancelQueries([
					BOOKMARKS_KEY,
					isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID,
				]);

				const previousData = queryClient.getQueryData([
					BOOKMARKS_KEY,
					isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID,
				]);

				// Optimistically update to the new value
				queryClient.setQueryData(
					[
						BOOKMARKS_KEY,
						isNull(CATEGORY_ID) ? session?.user?.id : CATEGORY_ID,
					],
					(old: { data: CategoriesData[] } | undefined) =>
						({
							...old,
							// do not filter when user is in all-bookmarks page
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
					[CATEGORIES_KEY, session?.user?.id],
					context?.previousData,
				);
			},
			// Always refetch after error or success:
			onSettled: async (_data, _error, variables) => {
				const { category_id: targetCategoryId } = variables || {};

				try {
					// First invalidate source collection (current category)
					if (!searchText) {
						await queryClient.invalidateQueries([
							BOOKMARKS_KEY,
							session?.user?.id,
							CATEGORY_ID,
							sortBy,
						]);
						// Then invalidate target collection (where we're moving the bookmark to)
						await queryClient.invalidateQueries([
							BOOKMARKS_KEY,
							session?.user?.id,
							targetCategoryId,
							sortBy,
						]);
					} else {
						const categoryData = queryClient.getQueryData([
							CATEGORIES_KEY,
							session?.user?.id,
						]) as {
							data: CategoriesData[];
							error: PostgrestError;
						};
						await queryClient.invalidateQueries([
							BOOKMARKS_KEY,
							session?.user?.id,
							searchSlugKey(categoryData) ?? CATEGORY_ID,
							searchText,
						]);
					}

					// Finally invalidate bookmarks count
					await queryClient.invalidateQueries([
						BOOKMARKS_COUNT_KEY,
						session?.user?.id,
					]);
				} finally {
					setSidePaneOptionLoading(null);
				}
			},
		},
	);

	return { addCategoryToBookmarkOptimisticMutation };
}
