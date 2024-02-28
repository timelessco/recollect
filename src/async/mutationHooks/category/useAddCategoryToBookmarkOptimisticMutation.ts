import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import isNull from "lodash/isNull";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useLoadersStore } from "../../../store/componentStore";
import { type CategoriesData } from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
} from "../../../utils/constants";
import { addCategoryToBookmark } from "../../supabaseCrudHelpers";

// adds cat to bookmark optimistically
export default function useAddCategoryToBookmarkOptimisticMutation() {
	const session = useSession();
	const queryClient = useQueryClient();
	const { sortBy } = useGetSortBy();
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

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
			onSettled: () => {
				void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
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

				setSidePaneOptionLoading(null);
			},
		},
	);

	return { addCategoryToBookmarkOptimisticMutation };
}
