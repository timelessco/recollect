import { useMutation, useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksTagData,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { BOOKMARKS_KEY, USER_TAGS_KEY } from "../../../utils/constants";
import { addTagToBookmark, addUserTags } from "../../supabaseCrudHelpers";

import useDebounce from "@/hooks/useDebounce";
import { handleClientError } from "@/utils/error-utils/client";

type CreateAndAssignTagPayload = {
	tagName: string;
	bookmarkId: number;
};

export function useCreateAndAssignTagMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	const createAndAssignTagMutation = useMutation({
		mutationFn: async ({ tagName, bookmarkId }: CreateAndAssignTagPayload) => {
			const tagResponse = (await addUserTags({
				tagsData: { name: tagName },
			})) as { data: UserTagsData[] };

			if (!tagResponse?.data || "message" in tagResponse) {
				handleClientError("Failed to create tag");
				throw new Error("Failed to create tag");
			}

			const newTagId = tagResponse?.data?.[0]?.id;
			if (!newTagId) {
				handleClientError("Failed to create tag: missing tag ID");
				throw new Error("Failed to create tag: missing tag ID");
			}

			const bookmarkResponse = (await addTagToBookmark({
				selectedData: {
					bookmark_id: bookmarkId,
					tag_id: newTagId,
				} as BookmarksTagData,
			})) as { data: SingleListData } | { message: string };

			if (!("data" in bookmarkResponse) || "message" in bookmarkResponse) {
				handleClientError("Failed to assign tag to bookmark");
				throw new Error("Failed to assign tag to bookmark");
			}

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
			if (debouncedSearch) {
				await queryClient.cancelQueries({
					queryKey: [
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						debouncedSearch,
					],
				});
			}

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
			const previousSearchData = debouncedSearch
				? queryClient.getQueryData([
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						debouncedSearch,
					])
				: undefined;

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

			// Helper to update bookmark tags in paginated data
			const updateBookmarkTagsInCache = (oldData: unknown) => {
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
			};

			// Update regular bookmarks cache
			queryClient.setQueryData(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				updateBookmarkTagsInCache,
			);

			if (debouncedSearch) {
				queryClient.setQueryData(
					[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, debouncedSearch],
					updateBookmarkTagsInCache,
				);
			}

			return {
				previousUserTags,
				previousBookmarks,
				previousSearchData,
				tempId,
				debouncedSearch,
			};
		},
		onError: (
			_error,
			_variables,
			context:
				| {
						previousUserTags: unknown;
						previousBookmarks: unknown;
						previousSearchData: unknown;
						debouncedSearch: string;
				  }
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

			if (context?.previousSearchData && context?.debouncedSearch) {
				queryClient.setQueryData(
					[
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						context?.debouncedSearch,
					],
					context.previousSearchData,
				);
			}
		},
		onSettled: (
			_data,
			_error,
			_variables,
			context:
				| {
						previousUserTags: unknown;
						previousBookmarks: unknown;
						previousSearchData: unknown;
						debouncedSearch: string;
				  }
				| undefined,
		) => {
			void queryClient.invalidateQueries({
				queryKey: [USER_TAGS_KEY, session?.user?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});
			// Use captured debouncedSearch from context to avoid stale closure
			if (context?.debouncedSearch) {
				void queryClient.invalidateQueries({
					queryKey: [
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						context?.debouncedSearch,
					],
				});
			}
		},
	});

	return { createAndAssignTagMutation };
}
