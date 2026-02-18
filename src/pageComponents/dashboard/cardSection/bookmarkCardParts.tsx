import Image from "next/image";
import classNames from "classnames";
import { isNil } from "lodash";

import { CategoryBadges } from "@/components/categoryBadges";
import { GetBookmarkIcon } from "@/components/get-bookmark-icon";
import DefaultUserIcon from "@/icons/user/defaultUserIcon";
import { type SingleListData } from "@/types/apiTypes";
import { EVERYTHING_URL, IMAGE_TYPE_PREFIX } from "@/utils/constants";

export function BookmarkAvatar({
	isCreatedByLoggedInUser,
	isListView,
	post,
}: {
	isCreatedByLoggedInUser: boolean;
	isListView: boolean;
	post: SingleListData;
}) {
	const className = classNames({
		"absolute h-[26px] w-[26px] rounded-full hidden group-hover:flex": true,
		"right-[65px] top-0": isCreatedByLoggedInUser,
		"right-[100px]": isListView,
		"right-0 top-0": !isCreatedByLoggedInUser,
	});

	if (!isNil(post?.user_id?.profile_pic)) {
		return (
			<Image
				alt="user_img"
				className={className}
				height={21}
				src={post.user_id.profile_pic}
				width={21}
			/>
		);
	}

	return (
		<DefaultUserIcon
			className={`hidden h-5 w-5 group-hover:flex ${className}`}
		/>
	);
}

export function BookmarkFavIcon({
	hasFavIconError,
	isUserInTweetsPage,
	onFavIconError,
	post,
}: {
	hasFavIconError: boolean;
	isUserInTweetsPage: boolean;
	onFavIconError: () => void;
	post: SingleListData;
}) {
	const icon = (
		<GetBookmarkIcon
			favIconErrorIds={hasFavIconError ? [post.id] : []}
			isUserInTweetsPage={isUserInTweetsPage}
			item={post}
			onFavIconError={onFavIconError}
			size={15}
		/>
	);

	const isImageIcon =
		(post?.meta_data?.favIcon || post?.meta_data?.twitter_avatar_url) &&
		!hasFavIconError;

	if (isImageIcon) {
		return <figure className="h-[15px] w-[15px]">{icon}</figure>;
	}

	const isImageMediaType =
		post?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX);

	return (
		<figure
			className={classNames("card-icon rounded-sm text-gray-1000", {
				rounded: isImageMediaType,
			})}
		>
			{icon}
		</figure>
	);
}

export function BookmarkCategoryBadge({
	categorySlug,
	post,
}: {
	categorySlug: string | null;
	post: SingleListData;
}) {
	if (categorySlug !== EVERYTHING_URL) {
		return null;
	}

	const displayCategories = post.addedCategories?.filter((cat) => cat.id !== 0);

	if (!displayCategories?.length) {
		return null;
	}

	return (
		<>
			<p className="flex items-center text-13 leading-[115%] font-450 tracking-[0.01em] text-gray-600">
				in
			</p>
			<CategoryBadges categories={displayCategories} maxVisible={2} />
		</>
	);
}
