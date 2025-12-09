import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { useIframeStore } from "../../../store/iframeStore";
import {
	type CategoriesData,
	type SingleListData,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	CATEGORY_ID_PATHNAME,
	IMAGE_TYPE_PREFIX,
	PDF_MIME_TYPE,
	PDF_TYPE,
	PREVIEW_PATH,
	tweetType,
	VIDEO_TYPE_PREFIX,
} from "../../../utils/constants";
import { searchSlugKey } from "../../../utils/helpers";
import { getCategorySlugFromRouter } from "../../../utils/url";
import { isYouTubeVideo, type CustomSlide } from "../LightboxUtils";

/**
 * Hook to transform bookmarks into lightbox slides
 */
export const useLightboxSlides = (bookmarks: SingleListData[] | undefined) => {
	const iframeEnabled = useIframeStore((state) => state.iframeEnabled);
	return useMemo(() => {
		if (!bookmarks) {
			return [];
		}

		return bookmarks?.map((bookmark) => {
			// Determine media types based on bookmark properties
			const isImage =
				bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ??
				bookmark?.meta_data?.isOgImagePreferred ??
				bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX);
			const isVideo =
				bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX) ||
				Boolean(bookmark?.meta_data?.video_url);

			return {
				src: bookmark?.url,
				// Set slide type for lightbox to handle appropriately
				type: isVideo
					? VIDEO_TYPE_PREFIX
					: isImage
						? IMAGE_TYPE_PREFIX
						: undefined,

				// Only include dimensions if not a PDF or not a YouTube video
				...(bookmark?.meta_data?.mediaType !== PDF_MIME_TYPE &&
					!bookmark?.type?.includes(PDF_TYPE) &&
					!isYouTubeVideo(bookmark?.url) &&
					(!bookmark?.meta_data?.iframeAllowed || !iframeEnabled) && {
						// using || instead of ?? to include 0
						width: bookmark?.meta_data?.width || 1_200,
						height: bookmark?.meta_data?.height || 1_200,
					}),
				// Add video-specific properties
				...(isVideo && {
					sources: [
						{
							src:
								bookmark?.type === tweetType
									? bookmark?.meta_data?.video_url
									: bookmark?.url,
							type: VIDEO_TYPE_PREFIX,
						},
					],
				}),
			};
		}) as CustomSlide[];
	}, [bookmarks, iframeEnabled]);
};

interface UseLightboxNavigationProps {
	activeIndex: number;
	bookmarks: SingleListData[] | undefined;
	isPage?: boolean;
	setActiveIndex: (index: number) => void;
}

/**
 * Hook to handle lightbox navigation, query invalidation, and URL updates
 */
export const useLightboxNavigation = ({
	activeIndex,
	bookmarks,
	isPage,
	setActiveIndex,
}: UseLightboxNavigationProps) => {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state?.session);
	const lastInvalidatedIndex = useRef<number | null>(null);
	const isCollectionChanged = useMiscellaneousStore(
		(state) => state.isCollectionChanged,
	);
	const setIsCollectionChanged = useMiscellaneousStore(
		(state) => state.setIsCollectionChanged,
	);
	const router = useRouter();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	/**
	 * Invalidate queries for a given bookmark index
	 */
	const invalidateQueriesForIndex = useCallback(
		async (index: number, updateLastInvalidated = true) => {
			const currentBookmark = bookmarks?.[index];
			if (!currentBookmark) {
				return;
			}

			const bookmarkCategoryId = currentBookmark.category_id;

			try {
				// Always invalidate the current view's category (the collection being viewed)
				if (CATEGORY_ID) {
					await queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID],
					});
				}

				// Also invalidate the bookmark's category if it's different from current view
				if (bookmarkCategoryId && bookmarkCategoryId !== CATEGORY_ID) {
					await queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id, bookmarkCategoryId],
					});
				}

				if (searchText) {
					const categoryData = queryClient.getQueryData<{
						data: CategoriesData[];
						error: PostgrestError;
					}>([CATEGORIES_KEY, session?.user?.id]);

					const searchCategorySlug = categoryData
						? searchSlugKey(categoryData)
						: CATEGORY_ID;

					await queryClient.invalidateQueries({
						queryKey: [
							BOOKMARKS_KEY,
							session?.user?.id,
							searchCategorySlug,
							searchText,
						],
					});
				}

				await queryClient.invalidateQueries({
					queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
				});

				if (updateLastInvalidated) {
					lastInvalidatedIndex.current = index;
				}
			} catch (error) {
				console.error("Error invalidating queries:", error);
			} finally {
				setIsCollectionChanged(false);
			}
		},
		[
			bookmarks,
			queryClient,
			session?.user?.id,
			searchText,
			CATEGORY_ID,
			setIsCollectionChanged,
		],
	);

	/**
	 * Handle view changes
	 * We define the logic here to capture the latest state (closures)
	 */
	const handleViewChange = (index: number) => {
		if (!isPage || !bookmarks?.[index]) {
			return;
		}

		// Only update if index actually changed
		if (index !== activeIndex) {
			setActiveIndex(index);
		}

		// Invalidate queries when slide changes
		if (index !== lastInvalidatedIndex.current && isCollectionChanged) {
			void invalidateQueriesForIndex(index);
		}

		// Update browser URL
		void router?.push(
			{
				pathname: `${CATEGORY_ID_PATHNAME}`,
				query: {
					category_id: getCategorySlugFromRouter(router),
					id: bookmarks?.[index]?.id,
				},
			},
			`${getCategorySlugFromRouter(router)}${PREVIEW_PATH}/${
				bookmarks?.[index]?.id
			}`,
			{ shallow: true },
		);
	};

	/**
	 * Handle lightbox close - invalidate queries if collection was changed
	 */
	const handleClose = useCallback(() => {
		if (isCollectionChanged && bookmarks?.[activeIndex]) {
			void invalidateQueriesForIndex(activeIndex, false);
		}
	}, [isCollectionChanged, bookmarks, activeIndex, invalidateQueriesForIndex]);

	/**
	 * Create a stable ref that always holds the latest version of the handler.
	 * We initialize it with the current handler so it works on first render.
	 */
	const onViewRef = useRef(handleViewChange);

	/**
	 * Update the ref whenever the handler's dependencies change.
	 * This ensures onViewRef.current always points to a function with fresh closures.
	 */
	useEffect(() => {
		onViewRef.current = handleViewChange;
	});

	return { onViewRef, handleClose };
};
