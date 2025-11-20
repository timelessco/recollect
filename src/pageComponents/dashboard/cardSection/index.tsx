import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { format } from "date-fns";
import { find, flatten, isEmpty, isNil, isNull, type Many } from "lodash";
import { Item } from "react-stately";

import loaderGif from "../../../../public/loader-gif.gif";
import { CollectionIcon } from "../../../components/collectionIcon";
import { PreviewLightBox } from "../../../components/lightbox/previewLightBox";
import ReadMore from "../../../components/readmore";
import { Spinner } from "../../../components/spinner";
import useGetCurrentUrlPath from "../../../hooks/useGetCurrentUrlPath";
import useGetViewValue from "../../../hooks/useGetViewValue";
import useIsUserInTweetsPage from "../../../hooks/useIsUserInTweetsPage";
import AudioIcon from "../../../icons/actionIcons/audioIcon";
import BackIcon from "../../../icons/actionIcons/backIcon";
import PlayIcon from "../../../icons/actionIcons/playIcon";
import TrashIconGray from "../../../icons/actionIcons/trashIconGray";
import EditIcon from "../../../icons/editIcon";
import FolderIcon from "../../../icons/folderIcon";
import ImageIcon from "../../../icons/imageIcon";
import LinkExternalIcon from "../../../icons/linkExternalIcon";
import LinkIcon from "../../../icons/linkIcon";
import DefaultUserIcon from "../../../icons/user/defaultUserIcon";
import VideoIcon from "../../../icons/videoIcon";
import {
	useLoadersStore,
	useMiscellaneousStore,
} from "../../../store/componentStore";
import {
	type BookmarksTagData,
	type BookmarkViewDataTypes,
	type CategoriesData,
	type SingleListData,
	type UserTagsData,
} from "../../../types/apiTypes";
import { type BookmarksViewTypes } from "../../../types/componentStoreTypes";
import {
	ALL_BOOKMARKS_URL,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	DOCUMENTS_URL,
	LINK_TYPE_PREFIX,
	LINKS_URL,
	PDF_MIME_TYPE,
	PREVIEW_ALT_TEXT,
	TRASH_URL,
	TWEETS_URL,
	VIDEO_TYPE_PREFIX,
	VIDEOS_URL,
	viewValues,
} from "../../../utils/constants";
import {
	getBaseUrl,
	getPreviewPathInfo,
	isBookmarkAudio,
	isBookmarkDocument,
	isBookmarkVideo,
	isCurrentYear,
	isUserInACategory,
	searchSlugKey,
} from "../../../utils/helpers";
import { getCategorySlugFromRouter } from "../../../utils/url";

import { BookmarksSkeletonLoader } from "./bookmarksSkeleton";
import { EditDropdownContent } from "./EditDropdownContent";
import { ImgLogic } from "./imageCard";
import ListBox from "./listBox";
import useAddTagToBookmarkMutation from "@/async/mutationHooks/tags/useAddTagToBookmarkMutation";
import useAddUserTagsMutation from "@/async/mutationHooks/tags/useAddUserTagsMutation";
import useRemoveTagFromBookmarkMutation from "@/async/mutationHooks/tags/useRemoveTagFromBookmarkMutation";
import { AriaDropdown, AriaDropdownMenu } from "@/components/ariaDropdown";
import { mutationApiCall } from "@/utils/apiHelpers";

export type onBulkBookmarkDeleteType = (
	bookmark_ids: number[],
	isTrash: boolean,
	deleteForever: boolean,
) => void;

export type CardSectionProps = {
	categoryViewsFromProps?: BookmarkViewDataTypes;

	deleteBookmarkId: number[] | undefined;
	isBookmarkLoading: boolean;
	isLoading?: boolean;
	isOgImgLoading: boolean;
	isPublicPage?: boolean;
	listData: SingleListData[];
	onBulkBookmarkDelete: onBulkBookmarkDeleteType;
	onCategoryChange: (bookmark_ids: number[], category_id: number) => void;
	onDeleteClick: (post: SingleListData[]) => void;
	onMoveOutOfTrashClick: (post: SingleListData) => void;
	showAvatar: boolean;
	userId: string;
	isLoadingProfile?: boolean;
	bookmarksCountData?: number;
	userTags?: UserTagsData[];
	isCategoryChangeLoading?: boolean;
	onCreateNewCategory?: (category: {
		label: string;
		value: string | number;
	}) => Promise<void>;
};

// Helper function to get the image source (screenshot or ogImage)
const getImageSource = (item: SingleListData) =>
	item?.ogImage ? item?.ogImage : item?.screenshot;

const CardSection = ({
	listData = [],
	isLoading = false,
	onDeleteClick,
	onMoveOutOfTrashClick,
	userId,
	showAvatar = false,
	isOgImgLoading = false,
	isBookmarkLoading = false,
	deleteBookmarkId,
	onCategoryChange,
	onBulkBookmarkDelete,
	isPublicPage = false,
	categoryViewsFromProps = undefined,
	isLoadingProfile = false,
	bookmarksCountData,
	userTags = [],
	isCategoryChangeLoading = false,
	onCreateNewCategory = async () => {},
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
	const [openedMenuId, setOpenedMenuId] = useState<number | null>(null);
	const CARD_DEFAULT_HEIGHT = 600;
	const CARD_DEFAULT_WIDTH = 600;
	// cat_id refers to cat slug here as its got from url
	const categorySlug = getCategorySlugFromRouter(router);
	const queryClient = useQueryClient();
	const isDeleteBookmarkLoading = false;
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const setCurrentBookmarkView = useMiscellaneousStore(
		(state) => state.setCurrentBookmarkView,
	);

	const isUserInTweetsPage = useIsUserInTweetsPage();
	const currentPath = useGetCurrentUrlPath();

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
	const { addUserTagsMutation } = useAddUserTagsMutation();

	const { addTagToBookmarkMutation } = useAddTagToBookmarkMutation();

	const { removeTagFromBookmarkMutation } = useRemoveTagFromBookmarkMutation();

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

	const bookmarksList = isEmpty(searchText)
		? listData
		: (searchBookmarksData?.pages?.flatMap((page) => page?.data ?? []) ?? []);
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
			"rounded-lg bg-whites-700 p-[5px] backdrop-blur-xs z-15  group-hover:flex";

		const externalLinkIcon = (
			<div
				className={`${iconBgClassName} hidden`}
				onClick={(event) => {
					event.preventDefault();
					window.open(post?.url, "_blank");
				}}
				onKeyDown={() => {}}
				onPointerDown={(event) => {
					event.stopPropagation();
				}}
				role="button"
				tabIndex={0}
			>
				<figure className="text-blacks-800">
					<LinkExternalIcon />
				</figure>
			</div>
		);
		const isMenuOpen = openedMenuId === post.id;

		const pencilIcon = (
			<div className="relative">
				<AriaDropdown
					isOpen={isMenuOpen}
					menuButton={
						<div
							className={`${iconBgClassName} ${!isPublicPage ? (window?.Cypress ? "flex" : isMenuOpen ? "flex" : "hidden") : "hidden"} ${isMenuOpen ? "bg-gray-100" : ""}`}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								setOpenedMenuId(isMenuOpen ? null : post.id);
							}}
							onKeyDown={() => {}}
							onPointerDown={(event) => {
								event.stopPropagation();
							}}
							role="button"
							tabIndex={0}
						>
							<figure className="text-gray-1000">
								<EditIcon />
							</figure>
						</div>
					}
					// Use relative positioning to keep menu anchored to button
					menuClassName="absolute top-full left-0 z-10  mt-1 bg-gray-50 shadow-custom-3 rounded-md focus:outline-none p-2 dropdown-content"
					menuOpenToggle={(isOpen) => {
						setOpenedMenuId(isOpen ? post.id : null);
					}}
				>
					{isMenuOpen ? (
						<AriaDropdownMenu
							className="dropdown-content"
							onClick={(event: React.MouseEvent) => {
								event.stopPropagation();
								event.preventDefault();
							}}
						>
							<EditDropdownContent
								post={post}
								onCategoryChange={async (value) => {
									if (value) {
										onCategoryChange([post.id], Number(value.value));
									}
								}}
								onCreateCategory={async (value) => {
									if (value) {
										await onCreateNewCategory(value);
									}
								}}
								addExistingTag={async (tag) => {
									const bookmarkTagsData = {
										bookmark_id: post.id,
										tag_id: Number.parseInt(
											`${tag[tag.length - 1]?.value}`,
											10,
										),
									} as unknown as BookmarksTagData;

									await mutationApiCall(
										addTagToBookmarkMutation.mutateAsync({
											selectedData: bookmarkTagsData,
										}),
									);
								}}
								removeExistingTag={async (tag) => {
									const delValue = tag.value;
									const currentBookark = find(
										bookmarksList,
										(item) => item?.id === post?.id,
									) as SingleListData;
									const delData = find(
										currentBookark?.addedTags,
										(item) => item?.id === delValue || item?.name === delValue,
									) as unknown as BookmarksTagData;

									await mutationApiCall(
										removeTagFromBookmarkMutation.mutateAsync({
											selectedData: {
												tag_id: delData?.id as number,
												bookmark_id: currentBookark?.id,
											},
										}),
									);
								}}
								createTag={async (tagData) => {
									try {
										const data = (await mutationApiCall(
											addUserTagsMutation.mutateAsync({
												tagsData: { name: tagData[tagData.length - 1]?.label },
											}),
										)) as { data: UserTagsData[] };

										// on edit we are adding the new tag to bookmark as the bookmark is
										// will already be there when editing
										const bookmarkTagsData = {
											bookmark_id: post?.id,
											tag_id: data?.data[0]?.id,
											user_id: userId,
										} as unknown as BookmarksTagData;

										await mutationApiCall(
											addTagToBookmarkMutation.mutateAsync({
												selectedData: bookmarkTagsData,
											}),
										);
									} catch {
										/* empty */
									}
								}}
								userTags={userTags}
								addedTags={post.addedTags}
								isCategoryChangeLoading={isCategoryChangeLoading}
								userId={userId}
							/>
						</AriaDropdownMenu>
					) : null}
				</AriaDropdown>
			</div>
		);

		const trashIcon = (
			<div
				className={`ml-2 ${iconBgClassName} hidden`}
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
				"right-[8px]":
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
									<Spinner
										className="h-3 w-3 animate-spin"
										style={{ color: "var(--color-plain-reverse)" }}
									/>
								) : (
									trashIcon
								)}
							</>
						) : (
							pencilIcon
						)}
					</div>
					<div className="absolute top-0 right-8 flex">{externalLinkIcon}</div>
				</>
			);
		}

		return <div className="absolute top-0 left-[10px]">{externalLinkIcon}</div>;
	};

	const renderAvatar = (item: SingleListData) => {
		const isCreatedByLoggedInUser = isBookmarkCreatedByLoggedinUser(item);

		const avatarClassName = classNames({
			"absolute h-[26px] w-[26px] rounded-full": true,
			"right-[65px] top-0": isCreatedByLoggedInUser,
			"right-[100px]":
				cardTypeCondition === viewValues.list ||
				cardTypeCondition === viewValues.headlines,
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

		return <DefaultUserIcon className={`h-5 w-5 ${avatarClassName}`} />;
	};

	const renderUrl = (item: SingleListData) => (
		<p
			className={`relative mr-2 ml-1 truncate align-middle text-13 leading-[115%] tracking-[0.01em] text-gray-600 max-sm:w-[60%] ${
				!isNull(item?.category_id) && isNull(categorySlug)
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
			"w-full shadow-custom-8 rounded-t-lg group-hover:rounded-b-none":
				cardTypeCondition === viewValues.card,
			"aspect-[1.8]":
				cardTypeCondition === viewValues.moodboard &&
				(isOgImgLoading || isBookmarkLoading) &&
				img === undefined,
			"rounded-t-lg shadow-custom-8":
				cardTypeCondition === viewValues.moodboard,
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
					{isAudio && <AudioIcon className={playSvgClassName} />}
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
		const isVideo = isBookmarkVideo(item?.type);
		const isDocument = isBookmarkDocument(item?.type);
		const size = cardTypeCondition === viewValues.headlines ? 16 : 15;
		const favIconFigureClassName = classNames({
			"min-h-[16px] min-w-[16px]": cardTypeCondition === viewValues.headlines,
			"h-[14] w-[14px] mt-px": cardTypeCondition !== viewValues.headlines,
		});
		if (favIconErrorImgs?.includes(item?.id)) {
			return (
				<figure className="card-icon p-0.5 text-gray-1000">
					<LinkIcon />
				</figure>
			);
		}

		if (isUserInTweetsPage && item?.meta_data?.twitter_avatar_url) {
			// if user is in tweets page then show the twitter user avatar
			return (
				<figure className={favIconFigureClassName}>
					<Image
						alt="fav-icon"
						className="rounded-sm"
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
						className="rounded-sm"
						height={size}
						onError={() =>
							setFavIconErrorImgs([item?.id as never, ...favIconErrorImgs])
						}
						src={item?.meta_data?.favIcon ?? ""}
						width={size}
					/>
				</figure>
			);
		}

		if (
			isVideo ||
			item?.meta_data?.mediaType?.startsWith(VIDEO_TYPE_PREFIX) ||
			currentPath === VIDEOS_URL
		) {
			return (
				<figure className="card-icon rounded-sm p-0.5 text-gray-1000">
					<VideoIcon size="15" />
				</figure>
			);
		}

		if (
			isDocument ||
			item?.meta_data?.mediaType === PDF_MIME_TYPE ||
			currentPath === DOCUMENTS_URL
		) {
			return (
				<figure className="card-icon rounded-sm p-0.5 text-gray-1000">
					<FolderIcon size="15" />
				</figure>
			);
		}

		if (
			currentPath === LINKS_URL ||
			item?.meta_data?.mediaType?.startsWith(LINK_TYPE_PREFIX)
		) {
			return (
				<figure className="card-icon rounded p-0.5 text-gray-1000">
					<LinkIcon />
				</figure>
			);
		}

		return (
			<figure className="card-icon rounded-sm p-0.5 text-gray-1000">
				<ImageIcon size={`${size}`} />
			</figure>
		);
	};

	const renderCategoryBadge = (item: SingleListData) => {
		const bookmarkCategoryData = singleBookmarkCategoryData(
			item?.category_id ?? 0,
		);

		return (
			<>
				{!isNull(item?.category_id) &&
					categorySlug === ALL_BOOKMARKS_URL &&
					item?.category_id !== 0 && (
						<div className="ml-1 flex items-center text-13 leading-4 font-450 text-gray-600">
							<p className="mr-1">in</p>
							<CollectionIcon bookmarkCategoryData={bookmarkCategoryData} />
							<p className="ml-1 text-13 leading-4 font-450 text-gray-600">
								{bookmarkCategoryData?.category_name}
							</p>
						</div>
					)}
			</>
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
		"card-moodboard-info-wrapper space-y-[6px] rounded-b-lg px-2 py-3 dark:group-hover:bg-gray-alpha-100 duration-150 transition-all": true,
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

	const renderListCard = (item: SingleListData) => {
		const isMenuOpen = openedMenuId === item.id;

		return (
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
						{(bookmarksInfoValue as string[] | undefined)?.includes(
							"title",
						) && (
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
										{item?.addedTags?.map((tag) =>
											renderTag(tag?.id, tag?.name),
										)}
									</div>
								)}
							{(bookmarksInfoValue as string[] | undefined)?.includes(
								"info",
							) && (
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
				<div
					className={`absolute top-[15px] right-[8px] items-center space-x-1 group-hover:flex ${isMenuOpen ? "flex" : "hidden"}`}
				>
					{showAvatar && renderAvatar(item)}
					{renderEditAndDeleteIcons(item)}
				</div>
			</div>
		);
	};

	const listWrapperClass = classNames({
		// "p-2": cardTypeCondition === viewValues.list || cardTypeCondition === viewValues.headlines,
		"mt-[47px]": true,
		"px-4 py-2":
			cardTypeCondition === viewValues.list ||
			cardTypeCondition === viewValues.headlines,
		"py-2 px-3":
			cardTypeCondition === viewValues.moodboard ||
			cardTypeCondition === viewValues.card,
	});

	const renderItem = () => {
		const sortByCondition = renderSortByCondition();

		if (isLoadingProfile) {
			return (
				<div className="absolute inset-0 flex items-center justify-center">
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
			<PreviewLightBox
				id={lightboxId}
				open={lightboxOpen}
				setOpen={setLightboxOpen}
			/>
		</>
	);
};

export default CardSection;
