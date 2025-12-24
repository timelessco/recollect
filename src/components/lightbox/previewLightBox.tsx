import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { type DraggableItemProps } from "react-aria";

import useDebounce from "../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type CategoriesData, type SingleListData } from "../../types/apiTypes";
import {
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	CATEGORY_ID_PATHNAME,
	EVERYTHING_URL,
} from "../../utils/constants";
import { searchSlugKey } from "../../utils/helpers";
import { getCategorySlugFromRouter, getPublicPageInfo } from "../../utils/url";

import { useLightboxPrefetch } from "./hooks/useLightboxPrefetch";
import { CustomLightBox } from "./LightBox";

type PreviewLightBoxProps = {
	id: DraggableItemProps["key"] | null;
	open: boolean;
	setOpen: (value: boolean) => void;
	bookmarks?: SingleListData[];
	isPublicPage?: boolean;
};

export const PreviewLightBox = ({
	id,
	open,
	setOpen,
	bookmarks: bookmarksProp,
	isPublicPage = false,
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
	// if there is text in searchbar we get the cache of searched data else we get from everything
	// Skip query cache lookup for public pages since bookmarks are provided via props
	const previousData = isPublicPage
		? undefined
		: (queryClient.getQueryData([
				BOOKMARKS_KEY,
				session?.user?.id,
				searchText ? searchSlugKey(categoryData) : CATEGORY_ID,
				searchText ? debouncedSearch : sortBy,
			]) as {
				data: SingleListData[];
				pages: Array<{ data: SingleListData[] }>;
			});
	// Get and transform bookmarks from query cache or use provided bookmarks prop
	const bookmarks = useMemo(() => {
		// If bookmarks are provided as prop (e.g., for public pages), use them
		if (bookmarksProp) {
			return bookmarksProp;
		}

		// Otherwise, get from query cache (for logged-in users)
		const rawBookmarks =
			previousData?.pages?.flatMap((page) => page?.data ?? []) ?? [];
		// Transform SingleListData to match the expected type in CustomLightBox
		return rawBookmarks;
	}, [bookmarksProp, previousData?.pages]);

	// Prefetch next page when approaching the end of current data
	// For public pages, pass undefined pages to skip prefetching since all data is provided via props
	useLightboxPrefetch({
		open: open && !isPublicPage,
		activeIndex,
		bookmarksLength: bookmarks?.length ?? 0,
		pages: isPublicPage ? undefined : previousData?.pages,
	});

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

		// Update URL to remove preview segment for both authenticated and public pages
		if (isPublicPage) {
			const publicInfo = getPublicPageInfo(router);
			if (publicInfo) {
				void router.push(
					{
						pathname: `/public/[user_name]/[id]`,
						query: {
							user_name: publicInfo.user_name,
							id: publicInfo.category_slug,
						},
					},
					`/public/${publicInfo.user_name}/${publicInfo.category_slug}`,
					{ shallow: true },
				);
			}
		} else {
			// Update URL without page reload for logged-in users
			// Clean up path by removing leading slashes
			void router.push(
				{
					pathname: `${CATEGORY_ID_PATHNAME}`,
					query: {
						category_id: router?.query?.category_id ?? EVERYTHING_URL,
					},
				},
				getCategorySlugFromRouter(router) ?? EVERYTHING_URL,
				{ shallow: true },
			);
		}

		// Reset state after animation
		setActiveIndex(-1);
	}, [setOpen, router, isPublicPage]);

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
			isPublicPage={isPublicPage}
			setActiveIndex={setActiveIndex}
		/>
	);
};
