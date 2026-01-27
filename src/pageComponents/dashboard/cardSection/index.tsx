import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { Button } from "@base-ui/react/button";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { format } from "date-fns";
import { find, flatten, isEmpty, isNil, isNull, type Many } from "lodash";
import { Item } from "react-stately";

import loaderGif from "../../../../public/loader-gif.gif";
import { CategoryBadges } from "../../../components/categoryBadges";
import { GetBookmarkIcon } from "../../../components/get-bookmark-icon";
import { PreviewLightBox } from "../../../components/lightbox/previewLightBox";
import ReadMore from "../../../components/readmore";
import useGetViewValue from "../../../hooks/useGetViewValue";
import useIsUserInTweetsPage from "../../../hooks/useIsUserInTweetsPage";
import BackIcon from "../../../icons/actionIcons/backIcon";
import PlayIcon from "../../../icons/actionIcons/playIcon";
import LinkExternalIcon from "../../../icons/linkExternalIcon";
import DefaultUserIcon from "../../../icons/user/defaultUserIcon";
import {
	useLoadersStore,
	useMiscellaneousStore,
} from "../../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { type BookmarksViewTypes } from "../../../types/componentStoreTypes";
import {
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	DISCOVER_URL,
	EVERYTHING_URL,
	IMAGE_TYPE_PREFIX,
	PREVIEW_ALT_TEXT,
	TRASH_URL,
	TWEETS_URL,
	viewValues,
} from "../../../utils/constants";
import { useBookmarkImageSources } from "../../../utils/getBookmarkImageSource";
import {
	getBaseUrl,
	getPreviewPathInfo,
	isBookmarkAudio,
	isBookmarkOwner,
	isBookmarkVideo,
	isCurrentYear,
	isUserInACategory,
	searchSlugKey,
} from "../../../utils/helpers";
import { getCategorySlugFromRouter } from "../../../utils/url";

import { BookmarksSkeletonLoader } from "./bookmarksSkeleton";
import { EditPopover } from "./edit-popover";
import { ImgLogic } from "./imageCard";
import ListBox from "./listBox";
import { ClearTrashDropdown } from "@/components/clearTrashDropdown";
import TrashIconGray from "@/icons/actionIcons/trashIconGray";
import { cn } from "@/utils/tailwind-merge";

export type CardSectionProps = {
	categoryViewsFromProps?: BookmarkViewDataTypes;
	flattendPaginationBookmarkData?: SingleListData[];
	isBookmarkLoading: boolean;
	isLoading?: boolean;
	isOgImgLoading: boolean;
	isPublicPage?: boolean;
	listData: SingleListData[];
	onDeleteClick?: (post: SingleListData[]) => void;
	onMoveOutOfTrashClick?: (post: SingleListData) => void;
	showAvatar: boolean;
	userId: string;
	isLoadingProfile?: boolean;
	bookmarksCountData?: number;
};

const CardSection = ({
	listData = [],
	flattendPaginationBookmarkData = [],
	isLoading = false,
	onDeleteClick,
	onMoveOutOfTrashClick,
	userId,
	showAvatar = false,
	isOgImgLoading = false,
	isBookmarkLoading = false,
	isPublicPage = false,
	categoryViewsFromProps = undefined,
	isLoadingProfile = false,
	bookmarksCountData,
}: CardSectionProps) => {
	const router = useRouter();
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

	// const [errorImgs, setErrorImgs] = useState([]);
	const [favIconErrorImgs, setFavIconErrorImgs] = useState<number[]>([]);
	const [openedTrashMenuId, setOpenedTrashMenuId] = useState<number | null>(
		null,
	);
	const CARD_DEFAULT_HEIGHT = 600;
	const CARD_DEFAULT_WIDTH = 600;
	// cat_id refers to cat slug here as its got from url
	const categorySlug = getCategorySlugFromRouter(router);
	const queryClient = useQueryClient();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const setCurrentBookmarkView = useMiscellaneousStore(
		(state) => state.setCurrentBookmarkView,
	);

	const isUserInTweetsPage = useIsUserInTweetsPage();

	const getImageSource = (item: SingleListData) =>
		imageSources[item.id] ?? item?.ogImage;

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

	const imageSources = useBookmarkImageSources(bookmarksList);

	const bookmarksInfoValue = useGetViewValue(
		"cardContentViewArray",
		[],
		isPublicPage,
		categoryViewsFromProps,
	);

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

	const hasCoverImg = (bookmarksInfoValue as string[] | undefined)?.includes(
		"cover",
	);

	const sizesLogic = useMemo(() => {
		// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
		switch (cardTypeCondition) {
			case viewValues.moodboard:
			case viewValues.timeline:
				return "(max-width: 768px) 200px, 400px";
			case viewValues.list:
				return "100px";
			case viewValues.card:
				return "300px";

			default:
				return "500px";
		}
	}, [cardTypeCondition]);

	useEffect(() => {
		if (!isEmpty(cardTypeCondition)) {
			setCurrentBookmarkView(cardTypeCondition as BookmarksViewTypes);
		}
	}, [cardTypeCondition, setCurrentBookmarkView]);

	const isLoggedInUserTheCategoryOwner =
		!isUserInACategory(categorySlug as string) ||
		find(categoryData?.data, (item) => item?.category_slug === categorySlug)
			?.user_id?.id === userId;

	const renderEditAndDeleteCondition = (post: SingleListData) => {
		if (isLoggedInUserTheCategoryOwner) {
			return true;
		}

		// show if bookmark is created by loggedin user
		if (isBookmarkOwner(post?.user_id, userId)) {
			return true;
		}

		return false;
	};

	const isBookmarkCreatedByLoggedinUser = (post: SingleListData) => {
		// show if bookmark is created by loggedin user
		if (isBookmarkOwner(post?.user_id, userId)) {
			return true;
		}

		return false;
	};

	// Category owner can only see edit icon and can change to un-cat for bookmarks that are created by colaborators
	const renderEditAndDeleteIcons = (post: SingleListData) => {
		const isTrashMenuOpen = openedTrashMenuId === post.id;
		const isListView = cardTypeCondition === viewValues.list;
		const isStandardView =
			cardTypeCondition === viewValues.moodboard ||
			cardTypeCondition === viewValues.card ||
			cardTypeCondition === viewValues.timeline;

		const trashIcon =
			categorySlug === TRASH_URL ? (
				<ClearTrashDropdown
					isBottomBar={false}
					label="Delete Bookmark"
					onClearTrash={() => {
						onDeleteClick?.([post]);
					}}
					isClearingTrash={false}
					isOpen={isTrashMenuOpen}
					menuOpenToggle={(isOpen) => {
						setOpenedTrashMenuId(isOpen ? post.id : null);
					}}
				/>
			) : (
				<Button
					className="z-15 ml-2 hidden rounded-lg bg-whites-700 p-[5px] backdrop-blur-xs outline-none group-hover:flex focus-visible:ring-2 focus-visible:ring-blue-500"
					onClick={() => onDeleteClick?.([post])}
				>
					<TrashIconGray />
				</Button>
			);

		if (isPublicPage) {
			return (
				<div
					className={cn("absolute top-0", {
						"right-[8px]": isStandardView,
						"left-[-34px]": isListView,
					})}
				>
					<a
						href={post.url}
						target="_blank"
						rel="noopener noreferrer"
						className="z-15 hidden rounded-lg bg-whites-700 p-[5px] text-blacks-800 backdrop-blur-xs outline-none group-hover:flex focus-visible:ring-2 focus-visible:ring-blue-500"
					>
						<LinkExternalIcon />
					</a>
				</div>
			);
		}

		// In trash page
		if (renderEditAndDeleteCondition(post) && categorySlug === TRASH_URL) {
			return (
				<div
					className={cn(
						"absolute top-[2px] group-hover:flex",
						isTrashMenuOpen ? "flex" : "hidden",
						isStandardView && "left-[17px]",
						isListView && "left-[-64px]",
					)}
				>
					<Button
						className="z-15 rounded-lg bg-whites-700 p-[5px] backdrop-blur-xs outline-none group-hover:flex focus-visible:ring-2 focus-visible:ring-blue-500"
						onClick={() => onMoveOutOfTrashClick?.(post)}
					>
						<BackIcon />
					</Button>

					{trashIcon}
				</div>
			);
		}

		// Default logged in user can see edit and delete icons
		if (renderEditAndDeleteCondition(post)) {
			return (
				<>
					<div
						className={cn("absolute top-0 flex", {
							"left-[-94px]": isListView,
							"left-[15px]": isStandardView,
						})}
					>
						<EditPopover post={post} userId={userId} />

						{/* Only show trash icon if the bookmark is created by the logged in user */}
						{isBookmarkCreatedByLoggedinUser(post) ? trashIcon : null}
					</div>

					<div className="absolute top-0 right-8">
						<a
							href={post.url}
							target="_blank"
							rel="noopener noreferrer"
							className="z-15 hidden rounded-lg bg-whites-700 p-[5px] text-blacks-800 backdrop-blur-xs group-hover:flex"
						>
							<LinkExternalIcon />
						</a>
					</div>
				</>
			);
		}

		return (
			<div className="absolute top-0 left-[15px]">
				<a
					href={post.url}
					target="_blank"
					rel="noopener noreferrer"
					className="z-15 hidden rounded-lg bg-whites-700 p-[5px] text-blacks-800 backdrop-blur-xs group-hover:flex"
				>
					<LinkExternalIcon />
				</a>
			</div>
		);
	};

	const renderAvatar = (item: SingleListData) => {
		const isCreatedByLoggedInUser = isBookmarkCreatedByLoggedinUser(item);

		const avatarClassName = classNames({
			"absolute h-[26px] w-[26px] rounded-full hidden group-hover:flex": true,
			"right-[65px] top-0": isCreatedByLoggedInUser,
			"right-[100px]": cardTypeCondition === viewValues.list,
			"right-0 top-0": !isCreatedByLoggedInUser,
		});

		if (!isNil(item?.user_id?.profile_pic)) {
			return (
				<Image
					alt="user_img"
					className={avatarClassName}
					height={21}
					src={item?.user_id?.profile_pic}
					width={21}
				/>
			);
		}

		return (
			<DefaultUserIcon
				className={`hidden h-5 w-5 group-hover:flex ${avatarClassName}`}
			/>
		);
	};

	const renderUrl = (item: SingleListData) => (
		<p
			className={`relative mr-2 ml-1 truncate align-middle text-13 leading-[115%] tracking-[0.01em] text-gray-600 max-sm:w-[60%] ${
				(item?.addedCategories?.length ?? 0) > 0 && isNull(categorySlug)
					? "pl-3 before:absolute before:top-1.5 before:left-0 before:h-1 before:w-1 before:rounded-full before:bg-black before:content-['']"
					: ""
			}`}
			id="base-url"
		>
			{getBaseUrl(item?.url)}
		</p>
	);

	const renderOgImage = (
		img: SingleListData["ogImage"],
		id: SingleListData["id"],
		blurUrl: SingleListData["meta_data"]["ogImgBlurUrl"],
		_height: SingleListData["meta_data"]["height"],
		_width: SingleListData["meta_data"]["width"],
		type: SingleListData["type"],
	) => {
		const isVideo = isBookmarkVideo(type);
		const isAudio = isBookmarkAudio(type);

		const figureClassName = classNames({
			"relative z-[-1]": isAudio || isVideo,
			"h-[48px] w-[80px] mr-3": cardTypeCondition === viewValues.list,
			"w-full shadow-custom-8": cardTypeCondition === viewValues.card,
			"aspect-[1.8]":
				cardTypeCondition === viewValues.moodboard &&
				(isOgImgLoading || isBookmarkLoading) &&
				img === undefined,
			"shadow-custom-8 rounded-lg": cardTypeCondition === viewValues.moodboard,
		});

		const playSvgClassName = classNames({
			"hover:fill-slate-500 transition ease-in-out delay-50 fill-gray-800": true,
			absolute: true,
			"bottom-[9px] left-[7px] ":
				cardTypeCondition === viewValues.moodboard ||
				cardTypeCondition === viewValues.card ||
				cardTypeCondition === viewValues.timeline,
			"top-[9px] left-[21px]": cardTypeCondition === viewValues.list,
		});

		return (
			// disabling as we dont need tab focus here
			// eslint-disable-next-line jsx-a11y/interactive-supports-focus
			<div onKeyDown={() => {}} role="button">
				<figure className={figureClassName}>
					{isVideo && (
						<PlayIcon
							className={playSvgClassName}
							onPointerDown={(event) => event.stopPropagation()}
						/>
					)}
					<ImgLogic
						_height={_height ?? 200}
						_width={_width ?? 200}
						blurUrl={blurUrl}
						cardTypeCondition={cardTypeCondition}
						hasCoverImg={hasCoverImg ?? false}
						id={id}
						img={img}
						isPublicPage={isPublicPage}
						sizesLogic={sizesLogic}
					/>
				</figure>
			</div>
		);
	};

	const renderFavIcon = (item: SingleListData) => {
		const size = 15;
		const favIconFigureClassName = classNames({
			"h-[14] w-[14px] mt-px": true,
		});

		const icon = (
			<GetBookmarkIcon
				item={item}
				isUserInTweetsPage={isUserInTweetsPage}
				favIconErrorIds={favIconErrorImgs}
				onFavIconError={(bookmarkId: number) => {
					setFavIconErrorImgs([bookmarkId, ...favIconErrorImgs]);
				}}
				size={size}
			/>
		);

		// Determine the figure className based on icon type
		// If it's a favicon or twitter avatar (Image component), use the smaller figure
		const isImageIcon =
			(item?.meta_data?.favIcon || item?.meta_data?.twitter_avatar_url) &&
			!favIconErrorImgs?.includes(item?.id);

		if (isImageIcon) {
			return <figure className={favIconFigureClassName}>{icon}</figure>;
		}

		// For video, document, image icons, and fallback (SVG icons)
		const isImageMediaType =
			item?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX);
		const figureClassName = classNames({
			"card-icon rounded-sm p-0.5 text-gray-1000": true,
			rounded: isImageMediaType,
		});

		return <figure className={figureClassName}>{icon}</figure>;
	};

	const renderCategoryBadge = (item: SingleListData) => {
		// Only show categories in "Everything" view
		if (categorySlug !== EVERYTHING_URL) {
			return null;
		}

		// Filter out uncategorized (id=0) for display
		const displayCategories = item.addedCategories?.filter(
			(cat) => cat.id !== 0,
		);

		if (!displayCategories?.length) {
			return null;
		}

		return (
			<div className="ml-1 flex items-center text-13 leading-4 font-450 text-gray-600">
				<p className="mr-1">in</p>
				<CategoryBadges categories={displayCategories} maxVisible={2} />
			</div>
		);
	};

	const renderTag = (id: UserTagsData["id"], name: UserTagsData["name"]) => (
		<div
			className="rounded-[5px] bg-gray-100 px-1 py-[1.5px] text-13 leading-[14.9px] font-450 tracking-[0.13px] text-gray-500 not-italic"
			key={id}
		>
			#{name}
		</div>
	);

	const renderSortByCondition = () =>
		bookmarksList?.map((item) => ({
			...item,
			ogImage: item?.ogImage,
		}));

	const renderBookmarkCardTypes = (item: SingleListData) => {
		// NOTE: this is no separate view for timeline, only change is a style update in the listBox component
		// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
		switch (cardTypeCondition) {
			case viewValues.moodboard:
				return renderMoodboardAndCardType(item);
			case viewValues.card:
				return renderMoodboardAndCardType(item);
			case viewValues.list:
				return renderListCard(item);

			default:
				return renderMoodboardAndCardType(item);
		}
	};

	const moodboardAndCardInfoWrapperClass = classNames({
		"card-moodboard-info-wrapper space-y-[6px] px-2 py-3 dark:group-hover:bg-gray-alpha-100 rounded-b-lg duration-150 transition-all": true,
		grow: cardTypeCondition === viewValues.card,
	});

	const renderMoodboardAndCardType = (item: SingleListData) => (
		<div className="flex w-full flex-col" id="single-moodboard-card">
			{renderOgImage(
				getImageSource(item),
				item?.id,
				item?.meta_data?.ogImgBlurUrl ?? "",
				item?.meta_data?.height ?? CARD_DEFAULT_HEIGHT,
				item?.meta_data?.width ?? CARD_DEFAULT_WIDTH,
				item?.type,
			)}
			{bookmarksInfoValue?.length === 1 &&
			bookmarksInfoValue[0] === "cover" ? null : (
				<div className={moodboardAndCardInfoWrapperClass}>
					{(bookmarksInfoValue as string[] | undefined)?.includes("title") && (
						<p className="card-title truncate text-[14px] leading-[115%] font-medium tracking-[0.01em] text-gray-900">
							{item?.title}
						</p>
					)}
					{(bookmarksInfoValue as string[] | undefined)?.includes(
						"description",
					) &&
						!isEmpty(item?.description) && (
							<ReadMore
								className="card-title text-sm leading-[135%] tracking-[0.01em] text-gray-800"
								enable={isUserInTweetsPage}
							>
								{item?.description}
							</ReadMore>
						)}
					<div className="space-y-[6px] text-gray-500">
						{(bookmarksInfoValue as string[] | undefined)?.includes("tags") &&
							!isEmpty(item?.addedTags) && (
								<div className="flex flex-wrap items-center space-x-1">
									{item?.addedTags?.map((tag) => renderTag(tag?.id, tag?.name))}
								</div>
							)}
						{(bookmarksInfoValue as string[] | undefined)?.includes("info") && (
							<div className="flex flex-wrap items-center">
								{renderFavIcon(item)}
								{renderUrl(item)}
								{item?.inserted_at && (
									<p className="relative text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-600 before:absolute before:top-[8px] before:left-[-5px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-gray-600 before:content-['']">
										{format(
											new Date(item?.inserted_at || ""),
											isCurrentYear(item?.inserted_at)
												? "dd MMM"
												: "dd MMM YYY",
										)}
									</p>
								)}
								{renderCategoryBadge(item)}
							</div>
						)}
					</div>
				</div>
			)}
			<div className="absolute top-[10px] right-[8px] w-full items-center space-x-1">
				{showAvatar && renderAvatar(item)}
				{renderEditAndDeleteIcons(item)}
			</div>
		</div>
	);

	const renderListCard = (item: SingleListData) => (
		<div className="flex w-full items-center p-2" id="single-moodboard-card">
			{hasCoverImg ? (
				renderOgImage(
					getImageSource(item),
					item?.id,
					item?.meta_data?.ogImgBlurUrl ?? "",
					item?.meta_data?.height ?? CARD_DEFAULT_HEIGHT,
					item?.meta_data?.width ?? CARD_DEFAULT_WIDTH,
					item?.type,
				)
			) : (
				<div className="h-[48px]" />
			)}
			{bookmarksInfoValue?.length === 1 &&
			bookmarksInfoValue[0] === "cover" ? null : (
				<div className="overflow-hidden max-sm:space-y-1">
					{(bookmarksInfoValue as string[] | undefined)?.includes("title") && (
						<p className="card-title w-full truncate text-sm leading-4 font-medium text-gray-900">
							{item?.title}
						</p>
					)}
					<div className="flex flex-wrap items-center space-x-1 max-sm:space-y-1 max-sm:space-x-0">
						{(bookmarksInfoValue as string[] | undefined)?.includes(
							"description",
						) &&
							!isEmpty(item.description) && (
								<p className="mt-[6px] max-w-[400px] min-w-[200px] truncate overflow-hidden text-13 leading-4 font-450 break-all text-gray-600 max-sm:mt-px">
									{item?.description}
								</p>
							)}
						{(bookmarksInfoValue as string[] | undefined)?.includes("tags") &&
							!isEmpty(item?.addedTags) && (
								<div className="mt-[6px] flex items-center space-x-px max-sm:mt-px">
									{item?.addedTags?.map((tag) => renderTag(tag?.id, tag?.name))}
								</div>
							)}
						{(bookmarksInfoValue as string[] | undefined)?.includes("info") && (
							<div className="mt-[6px] flex flex-wrap items-center max-sm:mt-px max-sm:space-x-1">
								{renderFavIcon(item)}
								{renderUrl(item)}
								{item?.inserted_at && (
									<p className="relative text-13 leading-4 font-450 text-gray-600 before:absolute before:top-[8px] before:left-[-4px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-gray-600 before:content-['']">
										{format(
											new Date(item?.inserted_at || ""),
											isCurrentYear(item?.inserted_at)
												? "dd MMM"
												: "dd MMM YYY",
										)}
									</p>
								)}
								{renderCategoryBadge(item)}
							</div>
						)}
					</div>
				</div>
			)}
			<div className="absolute top-[15px] right-[8px] flex items-center space-x-1">
				{showAvatar && renderAvatar(item)}
				{renderEditAndDeleteIcons(item)}
			</div>
		</div>
	);

	const listWrapperClass = classNames({
		"mt-[47px]": !isPublicPage || categorySlug === DISCOVER_URL,
		"px-4 py-2": cardTypeCondition === viewValues.list,
		"py-2 px-3":
			cardTypeCondition === viewValues.moodboard ||
			cardTypeCondition === viewValues.card,
	});

	const renderItem = () => {
		const sortByCondition = renderSortByCondition();

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
					count={bookmarksCountData}
					type={cardTypeCondition}
					colCount={bookmarksColumns?.[0]}
				/>
			);
		}

		if (isEmpty(sortByCondition) && categorySlug === TWEETS_URL) {
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
			isEmpty(sortByCondition) &&
			!isSearchLoading &&
			!isBookmarkLoading &&
			searchBookmarksData?.pages?.length === 0
		) {
			return renderStatusMessage("No results found");
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
				{sortByCondition?.map((item) => (
					<Item key={item?.id} textValue={item?.id?.toString()}>
						{renderBookmarkCardTypes(item)}
					</Item>
				))}
			</ListBox>
		);
	};

	return (
		<>
			<div className={listWrapperClass}>{renderItem()}</div>
			<PreviewLightBox
				id={lightboxId}
				open={lightboxOpen}
				setOpen={setLightboxOpen}
			/>
		</>
	);
};

export default CardSection;
