import { useMutation, useQueryClient } from "@tanstack/react-query";

import useDebounce from "../../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksPaginatedDataTypes,
	type UpdateBookmarkDiscoverableApiPayload,
} from "../../../types/apiTypes";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { updateBookmarkDiscoverable } from "../../supabaseCrudHelpers";

type MutationContext = {
	debouncedSearch?: string;
	previousData?: BookmarksPaginatedDataTypes;
	previousSearchData?: BookmarksPaginatedDataTypes;
};

const updateBookmarkPages = (
	oldData: BookmarksPaginatedDataTypes | undefined,
	bookmarkId: number,
	isDiscoverable: boolean,
): BookmarksPaginatedDataTypes | undefined => {
	if (!oldData) {
		return oldData;
	}

	return {
		...oldData,
		pages: oldData.pages?.map((page) => ({
			...page,
			data: page.data?.map((item) =>
				item?.id === bookmarkId
					? { ...item, is_discoverable: isDiscoverable }
					: item,
			),
		})),
	};
};

export const useChangeDiscoverable = () => {
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const { sortBy } = useGetSortBy();
	const queryClient = useQueryClient();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	const changeDiscoverableMutation = useMutation({
		mutationFn: updateBookmarkDiscoverable,
		onMutate: async (variables: UpdateBookmarkDiscoverableApiPayload) => {
			const { bookmark_id, is_discoverable } = variables;

			await queryClient.cancelQueries({
				queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
			});

			const previousData =
				queryClient.getQueryData<BookmarksPaginatedDataTypes>([
					BOOKMARKS_KEY,
					session?.user?.id,
					CATEGORY_ID,
					sortBy,
				]);

			queryClient.setQueryData<BookmarksPaginatedDataTypes>(
				[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
				(old) => updateBookmarkPages(old, bookmark_id, is_discoverable),
			);

			let previousSearchData: BookmarksPaginatedDataTypes | undefined;

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
					(old) => updateBookmarkPages(old, bookmark_id, is_discoverable),
				);
			}

			return { previousData, previousSearchData, debouncedSearch };
		},
		onError: (_error, _variables, context: MutationContext = {}) => {
			if (context.previousData) {
				queryClient.setQueryData(
					[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
					context.previousData,
				);
			}

			if (context.debouncedSearch && context.previousSearchData) {
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
	});

	return { changeDiscoverableMutation };
};
