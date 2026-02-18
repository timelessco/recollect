import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { flatten, isEmpty, type Many } from "lodash";
import { Item } from "react-stately";

import loaderGif from "../../../../public/loader-gif.gif";
import useAddBookmarkMinDataOptimisticMutation from "../../../async/mutationHooks/bookmarks/useAddBookmarkMinDataOptimisticMutation";
import useFetchBookmarksCount from "../../../async/queryHooks/bookmarks/useFetchBookmarksCount";
import useFetchUserProfile from "../../../async/queryHooks/user/useFetchUserProfile";
import { PreviewLightBox } from "../../../components/lightbox/previewLightBox";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetViewValue from "../../../hooks/useGetViewValue";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type SingleListData,
} from "../../../types/apiTypes";
import { type BookmarksViewTypes } from "../../../types/componentStoreTypes";
import {
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	PREVIEW_ALT_TEXT,
	TWEETS_URL,
	viewValues,
} from "../../../utils/constants";
import {
	getBookmarkCountForCurrentPage,
	getPreviewPathInfo,
	searchSlugKey,
} from "../../../utils/helpers";
import { getCategorySlugFromRouter } from "../../../utils/url";

import { BookmarkCard } from "./bookmarkCard";
import { BookmarksSkeletonLoader } from "./bookmarksSkeleton";
import ListBox from "./listBox";
import { PublicMoodboard } from "./publicMoodboard";

export type CardSectionProps = {
	categoryViewsFromProps?: BookmarkViewDataTypes;
	flattendPaginationBookmarkData?: SingleListData[];
	isLoading?: boolean;
	/**
	 * When true, use discover layout (e.g. top margin) so SSR and client match without relying on router.
	 */
	isDiscoverPage?: boolean;
	isPublicPage?: boolean;
	listData: SingleListData[];
	onDeleteClick?: (post: SingleListData[]) => void;
	onMoveOutOfTrashClick?: (post: SingleListData) => void;
};

const CardSection = ({
	listData = [],
	flattendPaginationBookmarkData = [],
	isLoading = false,
	onDeleteClick,
	onMoveOutOfTrashClick,
	isPublicPage = false,
	isDiscoverPage = false,
	categoryViewsFromProps = undefined,
}: CardSectionProps) => {
	const router = useRouter();
	const userId = useSupabaseSession((state) => state.session?.user?.id);
	const { category_id: categoryId } = useGetCurrentCategoryId();
	const { isLoading: isLoadingProfile } = useFetchUserProfile();
	const { bookmarksCountData } = useFetchBookmarksCount();
	const { addBookmarkMinDataOptimisticMutation } =
		useAddBookmarkMinDataOptimisticMutation();
	const isBookmarkLoading = addBookmarkMinDataOptimisticMutation.isPending;
	const { setLightboxId, setLightboxOpen, lightboxOpen, lightboxId } =
		useMiscellaneousStore();
	// Handle route changes for lightbox
	useEffect(() => {
		const { isPreviewPath, previewId } = getPreviewPathInfo(
			router?.asPath,
			PREVIEW_ALT_TEXT,
		);

		if (isPreviewPath && previewId) {
			// Only update if the ID has changed
			setLightboxId(previewId);

			if (!lightboxOpen) {
				setLightboxOpen(true);
			}
		} else if (lightboxOpen) {
			setLightboxOpen(false);
			setLightboxId(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router?.asPath]);

	// cat_id refers to cat slug here as its got from url
	const categorySlug = getCategorySlugFromRouter(router);
	const queryClient = useQueryClient();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const setCurrentBookmarkView = useMiscellaneousStore(
		(state) => state.setCurrentBookmarkView,
	);

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
	// gets from the trigram search api
	const searchBookmarksData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		userId,
		searchSlugKey(categoryData),
		searchText,
	]) as {
		error: PostgrestError;
		pages: Array<{ data: SingleListData[]; error: PostgrestError }>;
	};

	const bookmarksList =
		isPublicPage || isEmpty(searchText)
			? listData
			: (searchBookmarksData?.pages?.flatMap((page) => page?.data ?? []) ?? []);

	const bookmarksColumns = flatten([
		useGetViewValue(
			"moodboardColumns",
			[10],
			isPublicPage,
			categoryViewsFromProps,
		) as Many<string | undefined>,
	]) as unknown as number[];

	const cardTypeCondition = useGetViewValue(
		"bookmarksView",
		"",
		isPublicPage,
		categoryViewsFromProps,
	);

	useEffect(() => {
		if (!isEmpty(cardTypeCondition)) {
			setCurrentBookmarkView(cardTypeCondition as BookmarksViewTypes);
		}
	}, [cardTypeCondition, setCurrentBookmarkView]);

	const listWrapperClass = classNames({
		"mt-[47px]": !isPublicPage || (isDiscoverPage && Boolean(userId)),
		"px-4 py-2":
			cardTypeCondition === viewValues.list ||
			cardTypeCondition === viewValues.timeline,

		"py-2 px-3":
			cardTypeCondition === viewValues.moodboard ||
			cardTypeCondition === viewValues.card,
	});

	const renderItem = () => {
		if (isLoadingProfile) {
			return (
				<div className="absolute inset-0 flex items-center justify-center dark:brightness-0 dark:invert">
					<Image
						src={loaderGif}
						alt="loader"
						className="h-12 w-12"
						loader={(source) => source.src}
					/>
				</div>
			);
		}

		if (isLoading) {
			return (
				<BookmarksSkeletonLoader
					count={getBookmarkCountForCurrentPage(
						bookmarksCountData?.data ?? undefined,
						categoryId,
					)}
					type={cardTypeCondition}
					colCount={bookmarksColumns?.[0]}
				/>
			);
		}

		if (isEmpty(bookmarksList) && categorySlug === TWEETS_URL) {
			return (
				<div className="p-6 text-center">
					Please install the Recollect extension to import all your tweets
				</div>
			);
		}

		const renderStatusMessage = (message: string) => (
			<div className="flex w-full items-center justify-center text-center">
				<p className="text-lg font-medium text-gray-600">{message}</p>
			</div>
		);

		// Only show "No results found" if we have search text, no results, and we're not loading anything
		if (
			!isEmpty(searchText) &&
			isEmpty(bookmarksList) &&
			!isSearchLoading &&
			!isBookmarkLoading &&
			searchBookmarksData?.pages?.length === 0
		) {
			return renderStatusMessage("No results found");
		}

		// Public page (and discover): use non-virtualized grid so pagination never resets scroll
		if (isPublicPage) {
			return (
				<PublicMoodboard
					bookmarksColumns={bookmarksColumns}
					bookmarksList={bookmarksList}
					renderCard={(item) => (
						<BookmarkCard
							categoryViewsFromProps={categoryViewsFromProps}
							isPublicPage={isPublicPage}
							onDeleteClick={onDeleteClick}
							onMoveOutOfTrashClick={onMoveOutOfTrashClick}
							post={item}
						/>
					)}
				/>
			);
		}

		return (
			<ListBox
				aria-label="Categories"
				bookmarksColumns={bookmarksColumns}
				bookmarksList={bookmarksList}
				cardTypeCondition={cardTypeCondition}
				flattendPaginationBookmarkData={flattendPaginationBookmarkData}
				isPublicPage={isPublicPage}
				selectionMode="multiple"
			>
				{bookmarksList?.map((item) => (
					<Item key={item?.id} textValue={item?.id?.toString()}>
						<BookmarkCard
							categoryViewsFromProps={categoryViewsFromProps}
							isPublicPage={isPublicPage}
							onDeleteClick={onDeleteClick}
							onMoveOutOfTrashClick={onMoveOutOfTrashClick}
							post={item}
						/>
					</Item>
				))}
			</ListBox>
		);
	};

	return (
		<>
			<div className={listWrapperClass}>{renderItem()}</div>
			<PreviewLightBox
				bookmarks={isPublicPage ? bookmarksList : undefined}
				id={lightboxId}
				open={lightboxOpen}
				setOpen={setLightboxOpen}
			/>
		</>
	);
};

export default CardSection;
