import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { useSupabaseSession } from "../../../store/componentStore";
import {
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { BOOKMARKS_KEY, USER_TAGS_KEY } from "../../../utils/constants";
import { addTagToBookmark, addUserTags } from "../../supabaseCrudHelpers";

type CreateAndAssignTagPayload = {
	tagName: string;
	bookmarkId: number;
};

// Creates a new tag and assigns it to a bookmark with optimistic updates
export default function useCreateAndAssignTagMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();

	const createAndAssignTagMutation = useMutation({
		mutationFn: async ({ tagName, bookmarkId }: CreateAndAssignTagPayload) => {
			const tagResponse = (await addUserTags({
				tagsData: { name: tagName },
			})) as { data: UserTagsData[] };

			const newTagId = tagResponse?.data?.[0]?.id;
			if (!newTagId) {
				throw new Error("Failed to create tag: missing tag ID");
			}

			await addTagToBookmark({
				selectedData: [
					{
						bookmark_id: bookmarkId,
						tag_id: newTagId,
						bookmark_tag_id: 0,
						user_id: session?.user?.id ?? "",
					},
				],
			});

			return { tagId: newTagId, tagName };
		},
		onMutate: async ({ tagName, bookmarkId }: CreateAndAssignTagPayload) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: [USER_TAGS_KEY, session?.user?.id],
			});
			await queryClient.cancelQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});

			const previousUserTags = queryClient.getQueryData([
				USER_TAGS_KEY,
				session?.user?.id,
			]);
			const previousBookmarks = queryClient.getQueryData([
				BOOKMARKS_KEY,
				session?.user?.id,
				CATEGORY_ID,
				sortBy,
			]);

			const tempId = -Date.now();

			queryClient.setQueryData(
				[USER_TAGS_KEY, session?.user?.id],
				(oldData: { data: UserTagsData[] } | undefined) => {
					const newTag = {
						id: tempId,
						name: tagName,
						user_id: session?.user?.id,
					};
					if (!oldData) {
						return { data: [newTag] };
					}

					return { ...oldData, data: [...(oldData.data || []), newTag] };
				},
			);

			queryClient.setQueryData(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				(oldData: unknown) => {
					const old = oldData as {
						pages: Array<{ data: SingleListData[] }>;
					};
					if (!old?.pages) {
						return oldData;
					}

					return {
						...old,
						pages: old.pages.map((pagesItem) => ({
							...pagesItem,
							data: pagesItem?.data?.map((dataItem) => {
								if (dataItem?.id === bookmarkId) {
									return {
										...dataItem,
										addedTags: [
											...(dataItem.addedTags || []),
											{ id: tempId, name: tagName },
										],
									};
								}

								return dataItem;
							}),
						})),
					};
				},
			);

			return { previousUserTags, previousBookmarks, tempId };
		},
		onError: (
			_error,
			_variables,
			context:
				| { previousUserTags: unknown; previousBookmarks: unknown }
				| undefined,
		) => {
			if (context?.previousUserTags) {
				queryClient.setQueryData(
					[USER_TAGS_KEY, session?.user?.id],
					context.previousUserTags,
				);
			}

			if (context?.previousBookmarks) {
				queryClient.setQueryData(
					[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
					context.previousBookmarks,
				);
			}
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: [USER_TAGS_KEY, session?.user?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});
		},
	});

	return { createAndAssignTagMutation };
}
