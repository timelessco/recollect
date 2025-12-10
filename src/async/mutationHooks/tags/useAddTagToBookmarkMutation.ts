import { useMutation, useQueryClient } from "@tanstack/react-query";
import { find, isArray } from "lodash";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type AddTagToBookmarkApiPayload,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { BOOKMARKS_KEY, USER_TAGS_KEY } from "../../../utils/constants";
import { addTagToBookmark } from "../../supabaseCrudHelpers";

import useDebounce from "@/hooks/useDebounce";

// add tag to a bookmark
export function useAddTagToBookmarkMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	const addTagToBookmarkMutation = useMutation({
		mutationFn: addTagToBookmark,
		onMutate: async (data: AddTagToBookmarkApiPayload) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
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

			// Snapshot the previous value
			const previousData = queryClient.getQueryData([
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

			// Helper to update bookmark tags in paginated data
			const updateBookmarkTagsInCache = (oldData: unknown) => {
				const old = oldData as { pages: Array<{ data: SingleListData[] }> };
				if (!old?.pages) {
					return oldData;
				}

				return {
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
										addedTags: [
											...dataItem.addedTags,
											{ id: updatingTag?.id, name: updatingTag?.name },
										],
									};
								} else {
									return {
										...dataItem,
										addedTags: [
											{ id: updatingTag?.id, name: updatingTag?.name },
										],
									};
								}
							} else {
								return dataItem;
							}
						}),
					})),
				};
			};

			// Optimistically update regular bookmarks cache
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

			// Return a context object with the snapshotted value (include debouncedSearch to avoid stale closure)
			return { previousData, previousSearchData, debouncedSearch };
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (
			_error,
			_variables,
			context:
				| {
						previousData: unknown;
						previousSearchData: unknown;
						debouncedSearch: string;
				  }
				| undefined,
		) => {
			if (context?.previousData) {
				queryClient.setQueryData(
					[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
					context.previousData,
				);
			}

			if (context?.previousSearchData && context?.debouncedSearch) {
				queryClient.setQueryData(
					[
						BOOKMARKS_KEY,
						session?.user?.id,
						CATEGORY_ID,
						context.debouncedSearch,
					],
					context.previousSearchData,
				);
			}
		},
		// Always refetch after error or success:
		onSettled: (
			_data,
			_error,
			_variables,
			context:
				| {
						previousData: unknown;
						previousSearchData: unknown;
						debouncedSearch: string;
				  }
				| undefined,
		) => {
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
						context.debouncedSearch,
					],
				});
			}
		},
	});
	return { addTagToBookmarkMutation };
}
