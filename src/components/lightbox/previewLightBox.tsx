import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isEmpty } from "lodash";
import { type DraggableItemProps } from "react-aria";

import useFetchPaginatedBookmarks from "../../async/queryHooks/bookmarks/useFetchPaginatedBookmarks";
import useSearchBookmarks from "../../async/queryHooks/bookmarks/useSearchBookmarks";
import useDebounce from "../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type CategoriesData, type SingleListData } from "../../types/apiTypes";
import {
	ALL_BOOKMARKS_URL,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	CATEGORY_ID_PATHNAME,
	PAGINATION_LIMIT,
} from "../../utils/constants";
import { searchSlugKey } from "../../utils/helpers";
import { getCategorySlugFromRouter } from "../../utils/url";

import { CustomLightBox } from "./LightBox";

type PreviewLightBoxProps = {
	id: DraggableItemProps["key"] | null;
	open: boolean;
	setOpen: (value: boolean) => void;
};

export const PreviewLightBox = ({
	id,
	open,
	setOpen,
}: PreviewLightBoxProps) => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const categoryData = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};
	const [activeIndex, setActiveIndex] = useState(-1);
	const { sortBy } = useGetSortBy();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	// Determine if we're currently searching
	const isSearching = !isEmpty(searchText);

	// Get fetchNextPage from pagination hooks
	const { fetchNextPage: fetchNextBookmarkPage } = useFetchPaginatedBookmarks();
	const { fetchNextPage: fetchNextSearchPage, hasNextPage: searchHasNextPage } =
		useSearchBookmarks();

	// if there is text in searchbar we get the chache of searched data else we get from all bookmarks
	const previousData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		session?.user?.id,
		searchText ? searchSlugKey(categoryData) : CATEGORY_ID,
		searchText ? debouncedSearch : sortBy,
	]) as {
		data: SingleListData[];
		pages: Array<{ data: SingleListData[] }>;
	};
	// Get and transform bookmarks from query cache
	const bookmarks = useMemo(() => {
		const rawBookmarks =
			previousData?.pages?.flatMap((page) => page?.data ?? []) ?? [];
		// Transform SingleListData to match the expected type in CustomLightBox
		return rawBookmarks;
	}, [previousData?.pages]);

	// Prefetch next page when approaching the end of current data
	useEffect(() => {
		if (!open || activeIndex === -1 || !bookmarks?.length) {
			return;
		}

		const threshold = 3;
		const shouldFetchMore = activeIndex >= bookmarks.length - threshold;

		const currentPageCount = previousData?.pages?.length ?? 0;
		const lastPageItemCount =
			previousData?.pages?.[currentPageCount - 1]?.data?.length ?? 0;
		const hasMoreData = lastPageItemCount >= PAGINATION_LIMIT;

		if (shouldFetchMore && hasMoreData) {
			if (isSearching && searchHasNextPage) {
				void fetchNextSearchPage();
			} else if (!isSearching) {
				void fetchNextBookmarkPage();
			}
		}
	}, [
		activeIndex,
		bookmarks?.length,
		open,
		previousData?.pages,
		isSearching,
		searchHasNextPage,
		fetchNextSearchPage,
		fetchNextBookmarkPage,
	]);

	// Only update activeIndex when the lightbox is being opened
	useEffect(() => {
		if (!bookmarks?.length) {
			return;
		}

		if (open) {
			const newIndex = bookmarks?.findIndex(
				(bookmark) => String(bookmark?.id) === String(id),
			);
			if (newIndex !== -1) {
				setActiveIndex(newIndex);
			}
		}
	}, [open, bookmarks, id]);

	// Handle close animation and cleanup
	const handleClose = useCallback(() => {
		setOpen(false);

		// Update URL without page reload
		// Clean up path by removing leading slashes
		void router.push(
			{
				pathname: `${CATEGORY_ID_PATHNAME}`,
				query: {
					category_id: router?.query?.category_id ?? ALL_BOOKMARKS_URL,
				},
			},
			getCategorySlugFromRouter(router) ?? ALL_BOOKMARKS_URL,
			{ shallow: true },
		);

		// Reset state after animation
		setActiveIndex(-1);
	}, [setOpen, router]);

	// Only render CustomLightBox when activeIndex is valid
	if (!open || activeIndex === -1) {
		return null;
	}

	return (
		<CustomLightBox
			activeIndex={activeIndex}
			bookmarks={bookmarks}
			handleClose={handleClose}
			isOpen={open}
			isPage
			setActiveIndex={setActiveIndex}
		/>
	);
};
