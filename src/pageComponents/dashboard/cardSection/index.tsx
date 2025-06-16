import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { getImgFromArr } from "array-to-image";
import { decode } from "blurhash";
import classNames from "classnames";
import format from "date-fns/format";
import { flatten, isNil, type Many } from "lodash";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import { Item } from "react-stately";

import ReadMore from "../../../components/readmore";
import Spinner from "../../../components/spinner";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import useGetViewValue from "../../../hooks/useGetViewValue";
import useIsMobileView from "../../../hooks/useIsMobileView";
import useIsUserInTweetsPage from "../../../hooks/useIsUserInTweetsPage";
import AudioIcon from "../../../icons/actionIcons/audioIcon";
import BackIcon from "../../../icons/actionIcons/backIcon";
import PlayIcon from "../../../icons/actionIcons/playIcon";
import TrashIconGray from "../../../icons/actionIcons/trashIconGray";
import EditIcon from "../../../icons/editIcon";
import FolderIcon from "../../../icons/folderIcon";
import ImageIcon from "../../../icons/imageIcon";
import LinkExternalIcon from "../../../icons/linkExternalIcon";
import DefaultUserIcon from "../../../icons/user/defaultUserIcon";
import VideoIcon from "../../../icons/videoIcon";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useModalStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { type BookmarksViewTypes } from "../../../types/componentStoreTypes";
import { options } from "../../../utils/commonData";
import {
	AI_SEARCH_KEY,
	ALL_BOOKMARKS_URL,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	colorPickerColors,
	defaultBlur,
	SEARCH_URL,
	TRASH_URL,
	TWEETS_URL,
	viewValues,
} from "../../../utils/constants";
import {
	clickToOpenInNewTabLogic,
	getBaseUrl,
	isBookmarkAudio,
	isBookmarkDocument,
	isBookmarkVideo,
	isCurrentYear,
	isUserInACategory,
} from "../../../utils/helpers";
import VideoModal from "../modals/videoModal";

import ListBox from "./listBox";

export type onBulkBookmarkDeleteType = (
	bookmark_ids: number[],
	isTrash: boolean,
	deleteForever: boolean,
) => void;

export type CardSectionProps = {
	categoryViewsFromProps?: BookmarkViewDataTypes;

	deleteBookmarkId: number[] | undefined;
	isBookmarkLoading: boolean;
	isOgImgLoading: boolean;
	isPublicPage?: boolean;
	listData: SingleListData[];
	onBulkBookmarkDelete: onBulkBookmarkDeleteType;
	onCategoryChange: (bookmark_ids: number[], category_id: number) => void;
	onDeleteClick: (post: SingleListData[]) => void;
	onEditClick: (item: SingleListData) => void;
	onMoveOutOfTrashClick: (post: SingleListData) => void;

	showAvatar: boolean;
	userId: string;
};

const CardSection = ({
	listData = [],
	onDeleteClick,
	onMoveOutOfTrashClick,
	onEditClick = () => null,
	userId,
	showAvatar = false,
	isOgImgLoading = false,
	isBookmarkLoading = false,
	deleteBookmarkId,
	onCategoryChange,
	onBulkBookmarkDelete,
	isPublicPage = false,
	categoryViewsFromProps = undefined,
}: CardSectionProps) => {
	const [errorImgs, setErrorImgs] = useState([]);
	const [favIconErrorImgs, setFavIconErrorImgs] = useState<number[]>([]);

	const CARD_DEFAULT_HEIGHT = 600;
	const CARD_DEFAULT_WIDTH = 600;
	const session = useSupabaseSession((state) => state.session);
	const router = useRouter();
	// cat_id reffers to cat slug here as its got from url
	const categorySlug = router?.asPath?.split("/")[1] || null;
	const queryClient = useQueryClient();
	const { isDesktop } = useIsMobileView();
	const isDeleteBookmarkLoading = false;
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const setCurrentBookmarkView = useMiscellaneousStore(
		(state) => state.setCurrentBookmarkView,
	);
	const toggleShowVideoModal = useModalStore(
		(state) => state.toggleShowVideoModal,
	);
	const setSelectedVideoId = useMiscellaneousStore(
		(state) => state.setSelectedVideoId,
	);
	const aiButtonToggle = useMiscellaneousStore((state) => state.aiButtonToggle);
	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
	const isUserInTweetsPage = useIsUserInTweetsPage();

	const { sortBy } = useGetSortBy();

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const categoryIdFromSlug = find(
		categoryData?.data,
		(item) => item?.category_slug === categorySlug,
	)?.id;

	const searchSlugKey = () => {
		if (categorySlug === ALL_BOOKMARKS_URL || categorySlug === SEARCH_URL) {
			return null;
		}

		if (typeof categoryIdFromSlug === "number") {
			return categoryIdFromSlug;
		}

		return categorySlug;
	};

	let searchBookmarksData = null;

	if (aiButtonToggle) {
		// gets from vector search api
		searchBookmarksData = queryClient.getQueryData([
			AI_SEARCH_KEY,
			searchSlugKey(),
			searchText,
		]) as {
			data: SingleListData[];
			error: PostgrestError;
		};
	} else {
		// gets from the trigram search api
		searchBookmarksData = queryClient.getQueryData([
			BOOKMARKS_KEY,
			userId,
			searchSlugKey(),
			searchText,
		]) as {
			data: SingleListData[];
			error: PostgrestError;
		};
	}

	// useEffect(() => {
	// if (searchBookmarksData?.data === undefined) {
	// toggleIsSearchLoading(true);
	// } else {
	// toggleIsSearchLoading(false);
	// }
	// }, [searchBookmarksData, toggleIsSearchLoading]);

	const isAllBookmarksDataFetching = useIsFetching({
		queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
	});

	const bookmarksList = isEmpty(searchText)
		? listData
		: searchBookmarksData?.data;

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

	const hasCoverImg = bookmarksInfoValue?.includes("cover" as never);

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
		if (post?.user_id?.id === userId) {
			return true;
		}

		return false;
	};

	const isBookmarkCreatedByLoggedinUser = (post: SingleListData) => {
		// show if bookmark is created by loggedin user
		if (post?.user_id?.id === userId) {
			return true;
		}

		return false;
	};

	const singleBookmarkCategoryData = (category_id: number) => {
		const name = find(categoryData?.data, (item) => item?.id === category_id);

		return name as CategoriesData;
	};

	// category owner can only see edit icon and can change to un-cat for bookmarks that are created by colaborators
	const renderEditAndDeleteIcons = (post: SingleListData) => {
		const iconBgClassName =
			"rounded-lg bg-custom-white-1 p-[5px] backdrop-blur-sm";

		const externalLinkIcon = (
			<div
				onClick={() => window.open(post?.url, "_blank")}
				onKeyDown={() => {}}
				role="button"
				tabIndex={0}
			>
				<figure className={`${iconBgClassName} ml-1`}>
					<LinkExternalIcon />
				</figure>
			</div>
		);

		const pencilIcon = (
			<div
				className={`${iconBgClassName}`}
				onClick={(event) => {
					event.preventDefault();
					onEditClick(post);
				}}
				onKeyDown={() => {}}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				role="button"
				tabIndex={0}
			>
				<figure>
					<EditIcon />
				</figure>
			</div>
		);

		const trashIcon = (
			<div
				className={`ml-2 ${iconBgClassName}`}
				onClick={(event) => {
					event.stopPropagation();
					onDeleteClick([post]);
				}}
				onKeyDown={() => {}}
				role="button"
				tabIndex={0}
			>
				<figure
					onPointerDown={(event) => {
						event.stopPropagation();
					}}
				>
					<TrashIconGray
						onPointerDown={(event) => {
							event.stopPropagation();
						}}
					/>
				</figure>
			</div>
		);

		if (isPublicPage) {
			const publicExternalIconClassname = classNames({
				"absolute top-0": true,
				"left-[11px]":
					cardTypeCondition === viewValues.moodboard ||
					cardTypeCondition === viewValues.card ||
					cardTypeCondition === viewValues.timeline,
				"left-[-34px]":
					cardTypeCondition === viewValues.list ||
					cardTypeCondition === viewValues.headlines,
			});
			return (
				<div className={publicExternalIconClassname}>{externalLinkIcon}</div>
			);
		}

		if (renderEditAndDeleteCondition(post) && categorySlug === TRASH_URL) {
			// in trash page

			const trashIconWrapperClassname = classNames({
				"absolute top-[2px] flex": true,
				"left-[17px]":
					cardTypeCondition === viewValues.moodboard ||
					cardTypeCondition === viewValues.card ||
					cardTypeCondition === viewValues.timeline,
				"left-[-64px]":
					cardTypeCondition === viewValues.list ||
					cardTypeCondition === viewValues.headlines,
			});
			return (
				<div className={trashIconWrapperClassname}>
					<div
						className={`${iconBgClassName}`}
						onClick={(event) => {
							event.preventDefault();
							onMoveOutOfTrashClick(post);
						}}
						onKeyDown={() => {}}
						role="button"
						tabIndex={0}
					>
						<figure>
							<BackIcon
								onPointerDown={(event) => {
									event.stopPropagation();
								}}
							/>
						</figure>
					</div>
					{trashIcon}
				</div>
			);
		}

		if (renderEditAndDeleteCondition(post)) {
			// default logged in user
			const editTrashClassname = classNames({
				"absolute top-0 flex": true,
				"left-[15px]":
					cardTypeCondition === viewValues.moodboard ||
					cardTypeCondition === viewValues.card ||
					cardTypeCondition === viewValues.timeline,
				"left-[-94px]":
					cardTypeCondition === viewValues.list ||
					cardTypeCondition === viewValues.headlines,
			});

			return (
				<>
					<div className={editTrashClassname}>
						{isBookmarkCreatedByLoggedinUser(post) ? (
							<>
								{pencilIcon}
								{isDeleteBookmarkLoading &&
								deleteBookmarkId?.includes(post?.id) ? (
									<div>
										<Spinner size={15} />
									</div>
								) : (
									trashIcon
								)}
							</>
						) : (
							pencilIcon
						)}
					</div>
					<div className=" absolute right-8 top-0">{externalLinkIcon}</div>
				</>
			);
		}

		return (
			<div className=" absolute left-[10px] top-0">{externalLinkIcon}</div>
		);
	};

	const renderAvatar = (item: SingleListData) => {
		const isCreatedByLoggedInUser = isBookmarkCreatedByLoggedinUser(item);

		const avatarClassName = classNames({
			"absolute h-5 w-5 rounded-full": true,
			"right-[65px] top-[3px]": isCreatedByLoggedInUser,
			"right-0 top-0": !isCreatedByLoggedInUser,
		});

		if (!isNil(item?.user_id?.profile_pic)) {
			return (
				<Image
					alt="user_img"
					className={avatarClassName}
					height={20}
					src={item?.user_id?.profile_pic}
					width={20}
				/>
			);
		}

		return <DefaultUserIcon className={`h-5 w-5 ${avatarClassName}`} />;
	};

	const renderUrl = (item: SingleListData) => (
		<p
			className={`relative ml-1 mr-2 truncate text-[13px] leading-4  text-custom-gray-10 sm:max-w-[60%] ${
				!isNull(item?.category_id) && isNull(categorySlug)
					? "pl-3 before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-black before:content-['']"
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
		height: SingleListData["meta_data"]["height"],
		width: SingleListData["meta_data"]["width"],
		type: SingleListData["type"],
		url: SingleListData["url"],
	) => {
		const isVideo = isBookmarkVideo(type);
		const isAudio = isBookmarkAudio(type);

		const imgClassName = classNames({
			"min-h-[48px] min-w-[80px] max-h-[48px] max-w-[80px] object-cover rounded":
				cardTypeCondition === viewValues.list,
			" w-full object-cover rounded-lg group-hover:rounded-b-none duration-150 moodboard-card-img aspect-[1.9047]":
				cardTypeCondition === viewValues.card,
			"w-full rounded-lg moodboard-card-img min-h-[192px] object-cover":
				cardTypeCondition === viewValues.moodboard ||
				cardTypeCondition === viewValues.timeline,
		});

		const loaderClassName = classNames({
			"animate-pulse bg-slate-200 w-full h-14 w-20 object-cover rounded-lg":
				cardTypeCondition === viewValues.list,
			"animate-pulse bg-slate-200 w-full aspect-[1.9047] w-full object-cover rounded-lg":
				cardTypeCondition === viewValues.card,
			"animate-pulse h-36 bg-slate-200 w-full rounded-lg w-full":
				cardTypeCondition === viewValues.moodboard,
		});

		const figureClassName = classNames({
			relative: isVideo || isAudio,
			"mr-3": cardTypeCondition === viewValues.list,
			"h-[48px] w-[80px]": cardTypeCondition === viewValues.list,
			"w-full shadow-custom-8 rounded-lg group-hover:rounded-b-none":
				cardTypeCondition === viewValues.card,
			"h-36":
				cardTypeCondition === viewValues.moodboard &&
				(isOgImgLoading || isBookmarkLoading) &&
				img === undefined,
			"rounded-lg shadow-custom-8": cardTypeCondition === viewValues.moodboard,
		});

		const errorImgAndVideoClassName = classNames({
			"h-full w-full rounded-lg object-cover": true,
			"group-hover:rounded-b-none": cardTypeCondition === viewValues.card,
		});

		const errorImgPlaceholder = (
			<Image
				alt="img-error"
				className={errorImgAndVideoClassName}
				height={200}
				src="/app-svgs/errorImgPlaceholder.svg"
				width={265}
			/>
		);

		const imgLogic = () => {
			if (hasCoverImg) {
				if ((isBookmarkLoading || isAllBookmarksDataFetching) && isNil(id)) {
					return <div className={loaderClassName} />;
				}

				if (errorImgs?.includes(id as never)) {
					return errorImgPlaceholder;
				}

				if (id && !img) {
					return errorImgPlaceholder;
				}

				let blurSource = "";

				if (
					!isNil(img) &&
					!isNil(blurUrl) &&
					!isEmpty(blurUrl) &&
					!isPublicPage
				) {
					const pixels = decode(blurUrl, 32, 32);
					const image = getImgFromArr(pixels, 32, 32);
					blurSource = image.src;
				}

				return (
					<>
						{img ? (
							<Image
								alt="bookmark-img"
								blurDataURL={blurSource || defaultBlur}
								className={imgClassName}
								height={height ?? 200}
								onError={() => setErrorImgs([id as never, ...errorImgs])}
								placeholder="blur"
								src={`${img}`}
								width={width ?? 200}
							/>
						) : (
							errorImgPlaceholder
						)}
					</>
				);
			}

			return null;
		};

		const playSvgClassName = classNames({
			"hover:fill-slate-500 transition ease-in-out delay-50 fill-gray-800":
				true,
			absolute: true,
			// "bottom-[-1%] left-[7%] transform translate-x-[-50%] translate-y-[-50%]":
			// cardTypeCondition === viewValues.moodboard || cardTypeCondition === viewValues.card,
			"bottom-[9px] left-[7px] ":
				cardTypeCondition === viewValues.moodboard ||
				cardTypeCondition === viewValues.card ||
				cardTypeCondition === viewValues.timeline,
			"top-[9px] left-[21px]": cardTypeCondition === viewValues.list,
		});

		return (
			// disabling as we dont need tab focus here
			// eslint-disable-next-line jsx-a11y/interactive-supports-focus
			<div
				onClick={(event) =>
					clickToOpenInNewTabLogic(
						event,
						url,
						isPublicPage,
						categorySlug === TRASH_URL,
					)
				}
				onKeyDown={() => {}}
				role="button"
			>
				<figure className={figureClassName}>
					{isVideo && (
						<PlayIcon
							className={playSvgClassName}
							onClick={() => {
								toggleShowVideoModal();
								setSelectedVideoId(id);
							}}
							onPointerDown={(event) => event.stopPropagation()}
						/>
					)}
					{isAudio && <AudioIcon className={playSvgClassName} />}
					{imgLogic()}
				</figure>
			</div>
		);
	};

	const renderFavIcon = (item: SingleListData) => {
		const isVideo = isBookmarkVideo(item?.type);
		const isDocument = isBookmarkDocument(item?.type);
		const size = cardTypeCondition === viewValues.headlines ? 16 : 15;
		const favIconFigureClassName = classNames({
			"min-h-[16px] min-w-[16px]": cardTypeCondition === viewValues.headlines,
			"h-[14] w-[14px]": cardTypeCondition !== viewValues.headlines,
		});

		if (favIconErrorImgs?.includes(item?.id)) {
			return <ImageIcon size={`${size}`} />;
		}

		if (isUserInTweetsPage && item?.meta_data?.twitter_avatar_url) {
			// if user is in tweets page then show the twitter user avatar
			return (
				<figure className={favIconFigureClassName}>
					<Image
						alt="fav-icon"
						className="rounded"
						height={size}
						onError={() =>
							setFavIconErrorImgs([item?.id as never, ...favIconErrorImgs])
						}
						src={item?.meta_data?.twitter_avatar_url}
						width={size}
					/>
				</figure>
			);
		}

		if (item?.meta_data?.favIcon) {
			return (
				<figure className={favIconFigureClassName}>
					<Image
						alt="fav-icon"
						className="rounded"
						height={size}
						onError={() =>
							setFavIconErrorImgs([item?.id as never, ...favIconErrorImgs])
						}
						src={item?.meta_data?.favIcon}
						width={size}
					/>
				</figure>
			);
		}

		if (isVideo) {
			return <VideoIcon size="15" />;
		}

		if (isDocument) {
			return <FolderIcon size="15" />;
		}

		return <ImageIcon size="15" />;
	};

	const renderCategoryBadge = (item: SingleListData) => {
		const bookmarkCategoryData = singleBookmarkCategoryData(item?.category_id);

		return (
			<>
				{!isNull(item?.category_id) &&
					categorySlug === ALL_BOOKMARKS_URL &&
					item?.category_id !== 0 && (
						<div className="ml-1 flex items-center text-[13px] font-450 leading-4 text-custom-gray-10">
							<p className="mr-1">in</p>
							<div
								className="flex h-[14px] w-[14px] items-center justify-center rounded-full"
								style={{ backgroundColor: bookmarkCategoryData?.icon_color }}
							>
								{find(
									options(),
									(optionItem) =>
										optionItem?.label === bookmarkCategoryData?.icon,
								)?.icon(
									bookmarkCategoryData?.icon_color === "#ffffff"
										? colorPickerColors[1]
										: colorPickerColors[0],
									"9",
								)}
							</div>
							<p className="ml-1 text-[13px] font-450 leading-4 text-custom-gray-10">
								{bookmarkCategoryData?.category_name}
							</p>
						</div>
					)}
			</>
		);
	};

	const renderTag = (id: UserTagsData["id"], name: UserTagsData["name"]) => (
		<div
			className="rounded-[5px] bg-gray-gray-100 px-1 py-[1.5px] text-13 font-450 not-italic leading-[14.9px] tracking-[0.13px] text-gray-light-10"
			key={id}
		>
			#{name}
		</div>
	);

	const renderSortByCondition = () =>
		bookmarksList?.map((item) => ({
			...item,
			// @ts-expect-error // disabling because don't know why ogimage is in smallcase
			ogImage: item?.ogImage || (item?.ogimage as string),
		}));

	const renderBookmarkCardTypes = (item: SingleListData) => {
		// NOTE: this is no separate view for timeline, only change is a style update in the listBox component
		switch (cardTypeCondition) {
			case viewValues.moodboard:
				return renderMoodboardAndCardType(item);
			case viewValues.card:
				return renderMoodboardAndCardType(item);
			case viewValues.headlines:
				return renderHeadlinesCard(item);
			case viewValues.list:
				return renderListCard(item);
			default:
				return renderMoodboardAndCardType(item);
		}
	};

	const moodboardAndCardInfoWrapperClass = classNames({
		"card-moodboard-info-wrapper space-y-[6px] rounded-lg px-2 py-3": true,
		"flex-grow": cardTypeCondition === viewValues.card,
	});

	const renderMoodboardAndCardType = (item: SingleListData) => (
		<div className="flex w-full flex-col" id="single-moodboard-card">
			{renderOgImage(
				item?.ogImage,
				item?.id,
				item?.meta_data?.ogImgBlurUrl ?? "",
				item?.meta_data?.height ?? CARD_DEFAULT_HEIGHT,
				item?.meta_data?.width ?? CARD_DEFAULT_WIDTH,
				item?.type,
				item?.url,
			)}
			{bookmarksInfoValue?.length === 1 &&
			bookmarksInfoValue[0] === "cover" ? null : (
				<div className={moodboardAndCardInfoWrapperClass}>
					{bookmarksInfoValue?.includes("title" as never) && (
						<p className="card-title truncate text-sm font-medium leading-4 text-gray-light-12">
							{item?.title}
						</p>
					)}
					{bookmarksInfoValue?.includes("description" as never) &&
						!isEmpty(item?.description) && (
							<ReadMore
								className="text-sm leading-4"
								enable={isUserInTweetsPage}
							>
								{item?.description}
							</ReadMore>
						)}
					<div className="space-y-[6px]">
						{bookmarksInfoValue?.includes("tags" as never) &&
							!isEmpty(item?.addedTags) && (
								<div className="flex flex-wrap items-center space-x-1">
									{item?.addedTags?.map((tag) => renderTag(tag?.id, tag?.name))}
								</div>
							)}
						{bookmarksInfoValue?.includes("info" as never) && (
							<div className="flex flex-wrap items-center">
								{renderFavIcon(item)}
								{renderUrl(item)}
								{item?.inserted_at && (
									<p className="relative text-[13px] font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-5px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
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
			<div
				// eslint-disable-next-line tailwindcss/no-custom-classname
				className={`w-full items-center space-x-1 ${
					// @ts-expect-error // this is cypress env, TS check not needed
					!isPublicPage ? (window?.Cypress ? "flex" : "hidden") : "hidden"
				} helper-icons absolute right-[8px] top-[10px] group-hover:flex`}
			>
				{showAvatar && renderAvatar(item)}
				{renderEditAndDeleteIcons(item)}
			</div>
		</div>
	);

	const renderListCard = (item: SingleListData) => (
		<div className="flex w-full items-center p-2" id="single-moodboard-card">
			{hasCoverImg ? (
				renderOgImage(
					item?.ogImage,
					item?.id,
					item?.meta_data?.ogImgBlurUrl ?? "",
					item?.meta_data?.height ?? CARD_DEFAULT_HEIGHT,
					item?.meta_data?.width ?? CARD_DEFAULT_WIDTH,
					item?.type,
					item?.url,
				)
			) : (
				<div className="h-[48px]" />
			)}
			{bookmarksInfoValue?.length === 1 &&
			bookmarksInfoValue[0] === "cover" ? null : (
				<div className="overflow-hidden sm:space-y-1">
					{bookmarksInfoValue?.includes("title" as never) && (
						<p className="card-title w-full truncate text-sm font-medium leading-4 text-gray-light-12">
							{item?.title}
						</p>
					)}
					<div className="flex flex-wrap items-center space-x-1 sm:space-x-0 sm:space-y-1">
						{bookmarksInfoValue?.includes("description" as never) &&
							!isEmpty(item.description) && (
								<p className="mt-[6px] min-w-[200px] max-w-[400px] overflow-hidden truncate break-all text-13 font-450 leading-4 text-custom-gray-10 sm:mt-[1px]">
									{item?.description}
								</p>
							)}
						{bookmarksInfoValue?.includes("tags" as never) &&
							!isEmpty(item?.addedTags) && (
								<div className="mt-[6px] flex items-center space-x-[1px] sm:mt-[1px]">
									{item?.addedTags?.map((tag) => renderTag(tag?.id, tag?.name))}
								</div>
							)}
						{bookmarksInfoValue?.includes("info" as never) && (
							<div className="mt-[6px] flex flex-wrap items-center sm:mt-[1px] sm:space-x-1">
								{renderFavIcon(item)}
								{renderUrl(item)}
								{item?.inserted_at && (
									<p className="relative text-13 font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-4px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
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
			<div className="absolute right-[8px] top-[15px] hidden items-center space-x-1 group-hover:flex">
				{showAvatar && renderAvatar(item)}
				{renderEditAndDeleteIcons(item)}
			</div>
		</div>
	);

	const renderHeadlinesCard = (item: SingleListData) => (
		<div className="group flex h-[53px] w-full p-2" key={item?.id}>
			{renderFavIcon(item)}
			{bookmarksInfoValue?.length === 1 &&
			bookmarksInfoValue[0] === "cover" ? null : (
				<div className=" ml-[10px] w-full overflow-hidden">
					{bookmarksInfoValue?.includes("title" as never) && (
						<p className="card-title w-[98%] truncate text-sm font-medium leading-4 text-gray-light-12">
							{item?.title}
						</p>
					)}
					<div className="mt-[6px] space-y-2">
						{bookmarksInfoValue?.includes("info" as never) && (
							<div className="flex items-center space-x-2">
								{renderUrl(item)}
								{item?.inserted_at && (
									<p className="relative text-13 font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-4px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
										{format(
											new Date(item?.inserted_at || ""),
											isCurrentYear(item?.inserted_at)
												? "dd MMM"
												: "dd MMM YYY",
										)}
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}
			<div className="absolute right-[8px] top-[11px] hidden items-center space-x-1 group-hover:flex">
				{showAvatar && renderAvatar(item)}
				{renderEditAndDeleteIcons(item)}
			</div>
		</div>
	);

	const listWrapperClass = classNames({
		// "p-2": cardTypeCondition === viewValues.list || cardTypeCondition === viewValues.headlines,
		"mt-[47px]": true,
		"px-4 py-2":
			cardTypeCondition === viewValues.list ||
			cardTypeCondition === viewValues.headlines,
		"py-2 pl-[28px] pr-[19px]":
			cardTypeCondition === viewValues.moodboard ||
			cardTypeCondition === viewValues.card,
	});

	const renderItem = () => {
		const sortByCondition = renderSortByCondition();

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

		if (isSearchLoading) {
			return renderStatusMessage("Searching...");
		}

		if (!isEmpty(searchText) && isEmpty(sortByCondition)) {
			return renderStatusMessage("No results found");
		}

		return (
			<ListBox
				aria-label="Categories"
				bookmarksColumns={bookmarksColumns}
				bookmarksList={bookmarksList}
				cardTypeCondition={cardTypeCondition}
				isPublicPage={isPublicPage}
				onBulkBookmarkDelete={onBulkBookmarkDelete}
				onCategoryChange={onCategoryChange}
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
			<VideoModal listData={listData} />
		</>
	);
};

export default CardSection;
