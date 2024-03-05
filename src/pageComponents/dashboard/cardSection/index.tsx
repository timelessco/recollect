import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import {
	MinusCircleIcon,
	PencilAltIcon,
	TrashIcon,
} from "@heroicons/react/solid";
import { useSession } from "@supabase/auth-helpers-react";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { getImgFromArr } from "array-to-image";
import { decode } from "blurhash";
import classNames from "classnames";
import format from "date-fns/format";
import { flatten, isNil, type Many } from "lodash";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";
import isNull from "lodash/isNull";
import { Item } from "react-stately";

import Badge from "../../../components/badge";
import Spinner from "../../../components/spinner";
// this import is the built in styles for video player we need its css file, this disabling the rule
// eslint-disable-next-line import/extensions
// import "node_modules/video-react/dist/video-react.css";

import PlayIcon from "../../../icons/actionIcons/playIcon";
import FolderIcon from "../../../icons/folderIcon";
import ImageIcon from "../../../icons/imageIcon";
import LinkExternalIcon from "../../../icons/linkExternalIcon";
import DefaultUserIcon from "../../../icons/user/defaultUserIcon";
import VideoIcon from "../../../icons/videoIcon";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useModalStore,
} from "../../../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type FetchSharedCategoriesData,
	type ProfilesTableTypes,
	type SingleListData,
} from "../../../types/apiTypes";
import { type BookmarksViewTypes } from "../../../types/componentStoreTypes";
import { options } from "../../../utils/commonData";
import {
	ALL_BOOKMARKS_URL,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	colorPickerColors,
	defaultBlur,
	SEARCH_URL,
	SHARED_CATEGORIES_TABLE_NAME,
	TRASH_URL,
	USER_PROFILE,
} from "../../../utils/constants";
import {
	clickToOpenInNewTabLogic,
	getBaseUrl,
	isBookmarkDocument,
	isBookmarkVideo,
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

	const CARD_DEFAULT_HEIGHT = 194;
	const CARD_DEFAULT_WIDTH = 200;
	const session = useSession();
	const router = useRouter();
	// cat_id reffers to cat slug here as its got from url
	const categorySlug = router?.asPath?.split("/")[1] || null;
	const queryClient = useQueryClient();

	const isDeleteBookmarkLoading = false;
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const setCurrentBookmarkView = useMiscellaneousStore(
		(state) => state.setCurrentBookmarkView,
	);
	const toggleIsSearchLoading = useLoadersStore(
		(state) => state.toggleIsSearchLoading,
	);
	const toggleShowVideoModal = useModalStore(
		(state) => state.toggleShowVideoModal,
	);
	const setSelectedVideoId = useMiscellaneousStore(
		(state) => state.setSelectedVideoId,
	);

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const categoryIdFromSlug = find(
		categoryData?.data,
		(item) => item?.category_slug === categorySlug,
	)?.id;

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const searchSlugKey = () => {
		if (categorySlug === ALL_BOOKMARKS_URL || categorySlug === SEARCH_URL) {
			return null;
		}

		if (typeof categoryIdFromSlug === "number") {
			return categoryIdFromSlug;
		}

		return categorySlug;
	};

	const searchBookmarksData = queryClient.getQueryData([
		BOOKMARKS_KEY,
		userId,
		// categorySlug === ALL_BOOKMARKS_URL
		//   ? null
		//   : typeof categoryIdFromSlug === "number"
		//   ? categoryIdFromSlug
		//   : categorySlug,
		searchSlugKey(),
		searchText,
	]) as {
		data: SingleListData[];
		error: PostgrestError;
	};

	useEffect(() => {
		if (searchBookmarksData?.data === undefined) {
			toggleIsSearchLoading(true);
		} else {
			toggleIsSearchLoading(false);
		}
	}, [searchBookmarksData, toggleIsSearchLoading]);

	const sharedCategoriesData = queryClient.getQueryData([
		SHARED_CATEGORIES_TABLE_NAME,
	]) as {
		data: FetchSharedCategoriesData[];
		error: PostgrestError;
	};

	const bookmarksList = isEmpty(searchText)
		? listData
		: searchBookmarksData?.data;

	const currentCategoryData = find(
		categoryData?.data,
		(item) => item?.category_slug === categorySlug,
	);

	const isUserTheCategoryOwner = userId === currentCategoryData?.user_id?.id;

	const getViewValue = (
		viewType: "bookmarksView" | "cardContentViewArray" | "moodboardColumns",
		defaultReturnValue: string | [] | [number],
	) => {
		if (!isPublicPage) {
			if (isUserInACategory(categorySlug as string)) {
				if (isUserTheCategoryOwner) {
					// user is the owner of the category
					return currentCategoryData?.category_views?.[viewType];
				}

				if (!isEmpty(sharedCategoriesData?.data)) {
					// the user is not the category owner
					// gets the collab users layout data for the shared collection
					const sharedCategoriesDataUserData = find(
						sharedCategoriesData?.data,
						(item) =>
							item?.email === session?.user?.email &&
							item?.category_id === categoryIdFromSlug,
					);

					return sharedCategoriesDataUserData?.category_views?.[viewType];
				}

				return defaultReturnValue;
			}

			if (!isEmpty(userProfilesData?.data)) {
				return userProfilesData?.data[0]?.bookmarks_view?.[viewType];
			}
		} else {
			// we are in a public page

			return categoryViewsFromProps
				? categoryViewsFromProps[viewType]
				: defaultReturnValue;
		}

		return defaultReturnValue;
	};

	const bookmarksInfoValue = getViewValue("cardContentViewArray", []);
	const bookmarksColumns = flatten([
		getViewValue("moodboardColumns", [10]) as Many<string | undefined>,
	]) as unknown as number[];
	const cardTypeCondition = getViewValue("bookmarksView", "");

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
			"rounded-lg bg-custom-white-1 p-[7px] backdrop-blur-sm";

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
				className={`ml-1 ${iconBgClassName}`}
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
					<PencilAltIcon
						className="h-4 w-4 cursor-pointer text-gray-700"
						onPointerDown={(event) => {
							event.stopPropagation();
						}}
					/>
				</figure>
			</div>
		);

		const trashIcon = (
			<div
				className={`ml-1 ${iconBgClassName}`}
				onClick={(event) => {
					event.stopPropagation();
					onDeleteClick([post]);
				}}
				onKeyDown={() => {}}
				role="button"
				tabIndex={0}
			>
				<figure>
					<TrashIcon
						aria-hidden="true"
						className="h-4 w-4 cursor-pointer text-red-400"
						id="delete-bookmark-icon"
						onPointerDown={(event) => {
							event.stopPropagation();
						}}
					/>
				</figure>
			</div>
		);

		if (isPublicPage) {
			return externalLinkIcon;
		}

		if (renderEditAndDeleteCondition(post) && categorySlug === TRASH_URL) {
			return (
				<>
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
							<MinusCircleIcon
								className="h-4 w-4 cursor-pointer text-red-400"
								onPointerDown={(event) => {
									event.stopPropagation();
								}}
							/>
						</figure>
					</div>
					{trashIcon}
				</>
			);
		}

		if (renderEditAndDeleteCondition(post)) {
			return (
				<>
					{externalLinkIcon}
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
				</>
			);
		}

		return externalLinkIcon;
	};

	const renderAvatar = (item: SingleListData) => {
		if (!isNil(item?.user_id?.profile_pic)) {
			return (
				<Image
					alt="user_img"
					className=" h-5 w-5 rounded-full"
					height={20}
					src={item?.user_id?.profile_pic}
					width={20}
				/>
			);
		}

		return <DefaultUserIcon className="h-5 w-5" />;
	};

	const renderUrl = (item: SingleListData) => (
		<p
			className={`relative truncate text-[13px]  leading-4 text-custom-gray-10 ${
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

		const imgClassName = classNames({
			"min-h-[48px] min-w-[80px] max-h-[48px] max-w-[80px] object-cover rounded":
				cardTypeCondition === "list",
			"h-[194px] w-full object-cover duration-150 rounded-lg group-hover:rounded-b-none moodboard-card-img min-h-[192px]":
				cardTypeCondition === "card",
			"rounded-lg w-full rounded-lg group-hover:rounded-b-none moodboard-card-img min-h-[192px] object-cover":
				cardTypeCondition === "moodboard",
		});

		const loaderClassName = classNames({
			"animate-pulse bg-slate-200 w-full h-14 w-20 object-cover":
				cardTypeCondition === "list",
			"animate-pulse bg-slate-200 w-full h-[194px] w-full object-cover":
				cardTypeCondition === "card",
			"animate-pulse h-36 bg-slate-200 w-full rounded-lg w-full":
				cardTypeCondition === "moodboard",
		});

		const figureClassName = classNames({
			relative: isVideo,
			"mr-3": cardTypeCondition === "list",
			"h-[48px] w-[80px] ": cardTypeCondition === "list",
			"w-full h-[194px] ": cardTypeCondition === "card",
			"h-36":
				cardTypeCondition === "moodboard" &&
				(isOgImgLoading || isBookmarkLoading) &&
				img === undefined,
		});

		const errorImgAndVideoClassName = classNames({
			"h-full w-full rounded-lg object-cover": true,
			"group-hover:rounded-b-none":
				cardTypeCondition === "card" || cardTypeCondition === "moodboard",
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
			if (bookmarksInfoValue?.includes("cover" as never)) {
				if (isBookmarkLoading && img === undefined && id === undefined) {
					return <div className={loaderClassName} />;
				}

				if (errorImgs?.includes(id as never) || !img) {
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
			"top-[50%] left-[50%] transform translate-x-[-50%] translate-y-[-50%]":
				cardTypeCondition === "moodboard" || cardTypeCondition === "card",
			"top-[4px] left-[21px]": cardTypeCondition === "list",
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
					{imgLogic()}
				</figure>
			</div>
		);
	};

	const renderFavIcon = (item: SingleListData) => {
		const isVideo = isBookmarkVideo(item?.type);
		const isDocument = isBookmarkDocument(item?.type);
		const size = cardTypeCondition === "headlines" ? 16 : 15;
		const favIconFigureClassName = classNames({
			"min-h-[16px] min-w-[16px]": cardTypeCondition === "headlines",
			"h-[15] w-[15px]": cardTypeCondition !== "headlines",
		});

		if (favIconErrorImgs?.includes(item?.id)) {
			return <ImageIcon size={`${size}`} />;
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
						<Badge
							renderBadgeContent={() => (
								<div className="flex items-center">
									<figure className="h-[12px] w-[12px]">
										{find(
											options(),
											(optionItem) =>
												optionItem?.label === bookmarkCategoryData?.icon,
										)?.icon(colorPickerColors[1], "12")}
									</figure>
									<p className="ml-1">{bookmarkCategoryData?.category_name}</p>
								</div>
							)}
						/>
					)}
			</>
		);
	};

	const renderSortByCondition = () =>
		bookmarksList?.map((item) => ({
			...item,
			// @ts-expect-error // disabling because don't know why ogimage is in smallcase
			ogImage: item?.ogImage || (item?.ogimage as string),
		}));

	const renderBookmarkCardTypes = (item: SingleListData) => {
		switch (cardTypeCondition) {
			case "moodboard":
				return renderMoodboardAndCardType(item);
			case "card":
				return renderMoodboardAndCardType(item);
			case "headlines":
				return renderHeadlinesCard(item);
			case "list":
				return renderListCard(item);
			default:
				return renderMoodboardAndCardType(item);
		}
	};

	const renderMoodboardAndCardType = (item: SingleListData) => (
		<div className="w-full" id="single-moodboard-card">
			<div className="w-full">
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
					<div className="space-y-[6px] rounded-lg px-2 py-3">
						{bookmarksInfoValue?.includes("title" as never) && (
							<p className="card-title truncate text-sm font-medium leading-4 text-gray-light-12">
								{item?.title}
							</p>
						)}
						{bookmarksInfoValue?.includes("description" as never) &&
							!isEmpty(item?.description) && (
								<p className="line-clamp-3 overflow-hidden break-all text-sm leading-4">
									{item?.description}
								</p>
							)}
						<div className="space-y-[6px]">
							{bookmarksInfoValue?.includes("tags" as never) &&
								!isEmpty(item?.addedTags) && (
									<div className="flex flex-wrap items-center space-x-1">
										{item?.addedTags?.map((tag) => (
											<div className="text-xs text-blue-500" key={tag?.id}>
												#{tag?.name}
											</div>
										))}
									</div>
								)}
							{bookmarksInfoValue?.includes("info" as never) && (
								<div className="flex flex-wrap items-center space-x-2">
									{renderCategoryBadge(item)}
									{renderFavIcon(item)}
									{renderUrl(item)}
									{item?.inserted_at && (
										<p className="relative text-[13px]  font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-5px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
											{format(new Date(item?.inserted_at || ""), "MMMM dd")}
										</p>
									)}
								</div>
							)}
						</div>
					</div>
				)}
				<div
					// eslint-disable-next-line tailwindcss/no-custom-classname
					className={`items-center space-x-1 ${
						// @ts-expect-error // this is cypress env, TS check not needed
						!isPublicPage ? (window?.Cypress ? "flex" : "hidden") : "hidden"
					} helper-icons absolute right-[8px] top-[10px] group-hover:flex`}
				>
					{showAvatar && renderAvatar(item)}
					{renderEditAndDeleteIcons(item)}
				</div>
			</div>
		</div>
	);

	const renderListCard = (item: SingleListData) => (
		<div
			className="flex h-[64px] w-full items-center p-2"
			id="single-moodboard-card"
		>
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
				<div className=" overflow-hidden">
					{bookmarksInfoValue?.includes("title" as never) && (
						<p className="card-title w-full truncate text-sm font-medium leading-4 text-gray-light-12">
							{item?.title}
						</p>
					)}
					<div className="flex items-center space-x-1 space-y-2">
						{bookmarksInfoValue?.includes("description" as never) &&
							!isEmpty(item.description) && (
								<p className="mt-[6px] min-w-[200px] max-w-[400px] overflow-hidden truncate break-all text-13 font-450 leading-4 text-custom-gray-10">
									{item?.description}
								</p>
							)}
						{bookmarksInfoValue?.includes("tags" as never) && (
							<div className="mt-[6px] flex items-center">
								{item?.addedTags?.map((tag) => (
									<div className="mr-1 text-xs text-blue-500" key={tag?.id}>
										#{tag?.name}
									</div>
								))}
							</div>
						)}
						{bookmarksInfoValue?.includes("info" as never) && (
							<div className="mt-[6px] flex items-center space-x-2">
								{renderFavIcon(item)}
								{renderCategoryBadge(item)}
								{renderUrl(item)}
								{item?.inserted_at && (
									<p className="relative text-13 font-450 leading-4 text-custom-gray-10 before:absolute before:left-[-4px] before:top-[8px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-custom-gray-10 before:content-['']">
										{format(new Date(item?.inserted_at || ""), "dd MMM")}
									</p>
								)}
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
										{format(new Date(item?.inserted_at || ""), "dd MMM")}
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
		"p-2": cardTypeCondition === "list" || cardTypeCondition === "headlines",
		"p-6": cardTypeCondition === "moodboard" || cardTypeCondition === "card",
	});

	return (
		<>
			<div
				className={listWrapperClass}
				// style={{ height: "calc(100vh - 270px)"}}
			>
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
					{renderSortByCondition()?.map((item) => (
						<Item key={item?.id} textValue={item?.id?.toString()}>
							{renderBookmarkCardTypes(item)}
						</Item>
					))}
				</ListBox>
			</div>
			<VideoModal listData={listData} />
		</>
	);
};

export default CardSection;
