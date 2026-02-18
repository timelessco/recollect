import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import classNames from "classnames";
import { format } from "date-fns";
import { find, isEmpty, isNull } from "lodash";

import useFetchUserProfile from "@/async/queryHooks/user/useFetchUserProfile";
import ReadMore from "@/components/readmore";
import useGetViewValue from "@/hooks/useGetViewValue";
import useIsUserInTweetsPage from "@/hooks/useIsUserInTweetsPage";
import { useSupabaseSession } from "@/store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type SingleListData,
} from "@/types/apiTypes";
import { CATEGORIES_KEY, viewValues } from "@/utils/constants";
import { getDomain } from "@/utils/domain";
import { getBaseUrl, isBookmarkOwner, isCurrentYear } from "@/utils/helpers";
import { getCategorySlugFromRouter } from "@/utils/url";

import { BookmarkOgImage } from "./bookmarkOgImage";
import {
	BookmarkAvatar,
	BookmarkCategoryBadge,
	BookmarkFavIcon,
} from "./bookmarkCardParts";
import { EditAndDeleteIcons } from "./editAndDeleteIcons";

export type BookmarkCardProps = {
	categoryViewsFromProps?: BookmarkViewDataTypes;
	isPublicPage: boolean;
	onDeleteClick?: (post: SingleListData[]) => void;
	onMoveOutOfTrashClick?: (post: SingleListData) => void;
	post: SingleListData;
};

export function BookmarkCard({
	categoryViewsFromProps,
	isPublicPage,
	onDeleteClick,
	onMoveOutOfTrashClick,
	post,
}: BookmarkCardProps) {
	const [hasFavIconError, setHasFavIconError] = useState(false);

	const router = useRouter();
	const queryClient = useQueryClient();
	const userId = useSupabaseSession((state) => state.session)?.user?.id ?? "";
	const categorySlug = getCategorySlugFromRouter(router);
	const isUserInTweetsPage = useIsUserInTweetsPage();

	// Internalize image source (replaces img prop)
	const { userProfileData: profileData } = useFetchUserProfile();
	const img = useMemo(() => {
		const preferredDomains = profileData?.data?.[0]?.preferred_og_domains ?? [];
		if (preferredDomains.length === 0) {
			return post?.ogImage;
		}

		const domain = getDomain(post.url);
		const isPreferred =
			domain &&
			new Set(preferredDomains.map((item) => item.toLowerCase())).has(domain);
		return isPreferred
			? (post?.meta_data?.coverImage ?? post?.ogImage)
			: post?.ogImage;
	}, [post, profileData]);

	// Internalize showAvatar (replaces showAvatar prop)
	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as
		| { data: CategoriesData[]; error: PostgrestError }
		| undefined;

	const showAvatar =
		!isPublicPage &&
		(find(categoryData?.data, (item) => item?.category_slug === categorySlug)
			?.collabData?.length ?? 0) > 1;

	const cardTypeCondition = useGetViewValue(
		"bookmarksView",
		"",
		isPublicPage,
		categoryViewsFromProps,
	) as string;

	const bookmarksInfoValue = useGetViewValue(
		"cardContentViewArray",
		[],
		isPublicPage,
		categoryViewsFromProps,
	) as string[] | undefined;

	const hasCoverImg = bookmarksInfoValue?.includes("cover");
	const isListView = cardTypeCondition === viewValues.list;
	const coverOnly =
		bookmarksInfoValue?.length === 1 && bookmarksInfoValue[0] === "cover";
	const isCreatedByLoggedInUser = isBookmarkOwner(post?.user_id, userId);

	const tags = bookmarksInfoValue?.includes("tags") &&
		!isEmpty(post?.addedTags) && (
			<div
				className={classNames(
					"flex items-center",
					isListView
						? "mt-[6px] space-x-px max-sm:mt-px"
						: "flex-wrap space-x-1",
				)}
			>
				{post?.addedTags?.map((tag) => (
					<div
						className="rounded-[5px] bg-gray-100 px-1 py-[1.5px] text-13 leading-[14.9px] font-450 tracking-[0.13px] text-gray-500 not-italic"
						key={tag.id}
					>
						#{tag.name}
					</div>
				))}
			</div>
		);

	const infoSection = bookmarksInfoValue?.includes("info") && (
		<div
			className={classNames(
				"flex flex-wrap items-center",
				isListView ? "mt-[6px] max-sm:mt-px max-sm:space-x-1" : "gap-1",
			)}
		>
			<div className="flex min-w-0 items-center">
				<BookmarkFavIcon
					hasFavIconError={hasFavIconError}
					isUserInTweetsPage={isUserInTweetsPage}
					onFavIconError={() => setHasFavIconError(true)}
					post={post}
				/>
				<p
					className={`relative mr-2 ml-1 truncate align-middle text-13 leading-[115%] tracking-[0.01em] text-gray-600 ${
						(post?.addedCategories?.length ?? 0) > 0 && isNull(categorySlug)
							? "pl-3 before:absolute before:top-1.5 before:left-0 before:h-1 before:w-1 before:rounded-full before:bg-black before:content-['']"
							: ""
					}`}
					id="base-url"
				>
					{getBaseUrl(post?.url)}
				</p>
			</div>
			{post?.inserted_at && (
				<p
					className={classNames(
						"relative text-13 font-450 text-gray-600",
						isListView
							? "leading-4 before:absolute before:top-[8px] before:left-[-4px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-gray-600 before:content-['']"
							: "leading-[115%] tracking-[0.01em] before:absolute before:top-[8px] before:left-[-5px] before:h-[2px] before:w-[2px] before:rounded-full before:bg-gray-600 before:content-['']",
					)}
				>
					{format(
						new Date(post?.inserted_at || ""),
						isCurrentYear(post?.inserted_at) ? "dd MMM" : "dd MMM YYY",
					)}
				</p>
			)}
			<BookmarkCategoryBadge categorySlug={categorySlug} post={post} />
		</div>
	);

	if (isListView) {
		return (
			<div className="flex w-full items-center p-2" id="single-moodboard-card">
				{hasCoverImg ? (
					<BookmarkOgImage
						categoryViewsFromProps={categoryViewsFromProps}
						img={img}
						isPublicPage={isPublicPage}
						post={post}
					/>
				) : (
					<div className="h-[48px]" />
				)}
				{coverOnly ? null : (
					<div className="overflow-hidden max-sm:space-y-1">
						{bookmarksInfoValue?.includes("title") && (
							<p className="card-title w-full truncate text-sm leading-4 font-medium text-gray-900">
								{post?.title}
							</p>
						)}
						<div className="flex flex-wrap items-center space-x-1 max-sm:space-y-1 max-sm:space-x-0">
							{bookmarksInfoValue?.includes("description") &&
								!isEmpty(post.description) && (
									<p className="mt-[6px] max-w-[400px] min-w-[200px] truncate overflow-hidden text-13 leading-4 font-450 break-all text-gray-600 max-sm:mt-px">
										{post?.description}
									</p>
								)}
							{tags}
							{infoSection}
						</div>
					</div>
				)}
				<div className="absolute top-[15px] right-[8px] flex items-center space-x-1">
					{showAvatar && (
						<BookmarkAvatar
							isCreatedByLoggedInUser={isCreatedByLoggedInUser}
							isListView={isListView}
							post={post}
						/>
					)}
					<EditAndDeleteIcons
						categoryViewsFromProps={categoryViewsFromProps}
						isPublicPage={isPublicPage}
						onDeleteClick={onDeleteClick}
						onMoveOutOfTrashClick={onMoveOutOfTrashClick}
						post={post}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col" id="single-moodboard-card">
			<BookmarkOgImage
				categoryViewsFromProps={categoryViewsFromProps}
				img={img}
				isPublicPage={isPublicPage}
				post={post}
			/>
			{coverOnly ? null : (
				<div
					className={classNames(
						"card-moodboard-info-wrapper space-y-[6px] rounded-b-lg px-2 py-3 transition-all duration-150 dark:group-hover:bg-gray-alpha-100",
						cardTypeCondition === viewValues.card && "grow",
					)}
				>
					{bookmarksInfoValue?.includes("title") && (
						<p className="card-title truncate text-[14px] leading-[115%] font-medium tracking-[0.01em] text-gray-900">
							{post?.title}
						</p>
					)}
					{bookmarksInfoValue?.includes("description") &&
						!isEmpty(post?.description) && (
							<ReadMore
								className="card-title text-sm leading-[135%] tracking-[0.01em] text-gray-800"
								enable={isUserInTweetsPage}
							>
								{post?.description}
							</ReadMore>
						)}
					<div className="space-y-[6px] text-gray-500">
						{tags}
						{infoSection}
					</div>
				</div>
			)}
			<div className="absolute top-[10px] right-[8px] w-full items-center space-x-1">
				{showAvatar && (
					<BookmarkAvatar
						isCreatedByLoggedInUser={isCreatedByLoggedInUser}
						isListView={isListView}
						post={post}
					/>
				)}
				<EditAndDeleteIcons
					categoryViewsFromProps={categoryViewsFromProps}
					isPublicPage={isPublicPage}
					onDeleteClick={onDeleteClick}
					onMoveOutOfTrashClick={onMoveOutOfTrashClick}
					post={post}
				/>
			</div>
		</div>
	);
}
