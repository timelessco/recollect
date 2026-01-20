import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { type DraggableItemProps } from "react-aria";

import { usePageContext } from "../../hooks/use-page-context";
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
	DISCOVER_URL,
	EVERYTHING_URL,
} from "../../utils/constants";
import { searchSlugKey } from "../../utils/helpers";
import { getCategorySlugFromRouter, getPublicPageInfo } from "../../utils/url";
import {
	buildAuthenticatedCategoryUrl,
	buildPublicCategoryUrl,
} from "../../utils/url-builders";

import { useLightboxPrefetch } from "./hooks/useLightboxPrefetch";
import { CustomLightBox } from "./LightBox";

type PreviewLightBoxProps = {
	id: DraggableItemProps["key"] | null;
	open: boolean;
	setOpen: (value: boolean) => void;
	bookmarks?: SingleListData[];
};

export const PreviewLightBox = ({
	id,
	open,
	setOpen,
	bookmarks: bookmarksProp,
}: PreviewLightBoxProps) => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const categoryDataRaw = queryClient.getQueryData([
		CATEGORIES_KEY,
		session?.user?.id,
	]);
	const categoryData =
		categoryDataRaw &&
		typeof categoryDataRaw === "object" &&
		"data" in categoryDataRaw &&
		"error" in categoryDataRaw
			? (categoryDataRaw as {
					data: CategoriesData[];
					error: PostgrestError;
				})
			: undefined;
	const [activeIndex, setActiveIndex] = useState(-1);
	const { sortBy } = useGetSortBy();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const debouncedSearch = useDebounce(searchText, 500);

	const { isPublicPage, isDiscoverPage } = usePageContext();

	// Determine the correct query key based on whether we're on discover page
	const queryKey = isDiscoverPage
		? searchText
			? [BOOKMARKS_KEY, session?.user?.id, DISCOVER_URL, debouncedSearch]
			: [BOOKMARKS_KEY, DISCOVER_URL]
		: [
				BOOKMARKS_KEY,
				session?.user?.id,
				searchText && categoryData ? searchSlugKey(categoryData) : CATEGORY_ID,
				searchText ? debouncedSearch : sortBy,
			];

	// if there is text in searchbar we get the cache of searched data else we get from everything
	// Skip query cache lookup for public pages since bookmarks are provided via props
	const previousData = isPublicPage
		? undefined
		: (queryClient.getQueryData(queryKey) as {
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
		if (isPublicPage && !isDiscoverPage) {
			const publicInfo = getPublicPageInfo(router);
			if (publicInfo) {
				const { pathname, query, as } = buildPublicCategoryUrl(publicInfo);
				void router.push({ pathname, query }, as, { shallow: true });
			}
		} else {
			// Update URL without page reload for logged-in users
			const categorySlug = getCategorySlugFromRouter(router) ?? EVERYTHING_URL;
			const { pathname, query, as } =
				buildAuthenticatedCategoryUrl(categorySlug);
			void router.push({ pathname, query }, as, { shallow: true });
		}

		// Reset state after animation
		setActiveIndex(-1);
	}, [setOpen, router, isPublicPage, isDiscoverPage]);

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
