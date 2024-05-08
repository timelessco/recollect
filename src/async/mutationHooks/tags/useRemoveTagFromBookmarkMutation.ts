import { useMutation, useQueryClient } from "@tanstack/react-query";
import { find, isArray } from "lodash";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import {
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { BOOKMARKS_KEY, USER_TAGS_KEY } from "../../../utils/constants";
import { removeTagFromBookmark } from "../../supabaseCrudHelpers";

// add new tag for a user to add to bookmark
export default function useRemoveTagFromBookmarkMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();

	const removeTagFromBookmarkMutation = useMutation(removeTagFromBookmark, {
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

			const userTagsData = queryClient.getQueryData([
				USER_TAGS_KEY,
				session?.user?.id,
			]) as {
				data: UserTagsData[];
			};

			const updatingTag = find(
				userTagsData?.data,
				(item) =>
					item?.id ===
					(!isArray(data?.selectedData) ? data?.selectedData.tag_id : null),
			);

			// Optimistically update to the new value
			queryClient.setQueryData(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				(oldData: unknown) => {
					const old = oldData as { pages: Array<{ data: SingleListData[] }> };
					const updateData = {
						...old,
						pages: old?.pages?.map((pagesItem) => ({
							...pagesItem,
							data: pagesItem?.data?.map((dataItem) => {
								if (
									dataItem?.id ===
									(!isArray(data?.selectedData)
										? data?.selectedData.bookmark_id
										: null)
								) {
									if (dataItem?.addedTags) {
										return {
											...dataItem,
											addedTags: dataItem.addedTags?.filter(
												(tagItem) => tagItem.id !== updatingTag?.id,
											),
										};
									} else {
										return {
											...dataItem,
											addedTags: [],
										};
									}
								} else {
									return dataItem;
								}
							}),
						})),
					};
					return updateData;
				},
			);

			// Return a context object with the snapshotted value
			return { previousData };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (context: { previousData: unknown }) => {
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
		},
	});

	return { removeTagFromBookmarkMutation };
}
