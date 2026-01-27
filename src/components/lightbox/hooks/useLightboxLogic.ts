import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { useQueryClient } from "@tanstack/react-query";

import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import { useIframeStore } from "../../../store/iframeStore";
import { type SingleListData } from "../../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORY_ID_PATHNAME,
	IMAGE_TYPE_PREFIX,
	instagramType,
	PDF_MIME_TYPE,
	PDF_TYPE,
	PREVIEW_PATH,
	tweetType,
	VIDEO_TYPE_PREFIX,
} from "../../../utils/constants";
import { getCategorySlugFromRouter } from "../../../utils/url";
import { isYouTubeVideo, type CustomSlide } from "../LightboxUtils";

import { handleClientError } from "@/utils/error-utils/client";

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
				Boolean(bookmark?.meta_data?.video_url) ||
				Boolean(bookmark?.meta_data?.additionalVideos?.[0]);

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
								bookmark?.meta_data?.additionalVideos?.[0] ??
								(bookmark?.type === tweetType ||
								bookmark?.type === instagramType
									? bookmark?.meta_data?.video_url
									: bookmark?.url),
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

	/**
	 * Invalidate queries for a given bookmark index.
	 * Uses broad invalidation because we can't track which specific categories
	 * were added/removed during the lightbox session - optimistic updates have
	 * already modified addedCategories before we get here.
	 */
	const invalidateQueriesForIndex = useCallback(
		async (index: number, updateLastInvalidated = true) => {
			const currentBookmark = bookmarks?.[index];
			if (!currentBookmark) {
				return;
			}

			try {
				// Invalidate ALL bookmark queries for user (covers all collections)
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_KEY, session?.user?.id],
					}),
					queryClient.invalidateQueries({
						queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
					}),
				]);

				if (updateLastInvalidated) {
					lastInvalidatedIndex.current = index;
				}
			} catch (error) {
				handleClientError(error, "Error invalidating queries", false);
			} finally {
				setIsCollectionChanged(false);
			}
		},
		[bookmarks, queryClient, session?.user?.id, setIsCollectionChanged],
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
