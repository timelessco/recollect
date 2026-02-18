import { useState } from "react";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find } from "lodash";
import { Button } from "@base-ui/react/button";

import { ClearTrashDropdown } from "@/components/clearTrashDropdown";
import useGetViewValue from "@/hooks/useGetViewValue";
import BackIcon from "@/icons/actionIcons/backIcon";
import TrashIconGray from "@/icons/actionIcons/trashIconGray";
import LinkExternalIcon from "@/icons/linkExternalIcon";
import { useSupabaseSession } from "@/store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type SingleListData,
} from "@/types/apiTypes";
import { CATEGORIES_KEY, TRASH_URL, viewValues } from "@/utils/constants";
import { isBookmarkOwner, isUserInACategory } from "@/utils/helpers";
import { cn } from "@/utils/tailwind-merge";
import { getCategorySlugFromRouter } from "@/utils/url";

import { EditPopover } from "./edit-popover";

export type EditAndDeleteIconsProps = {
	categoryViewsFromProps?: BookmarkViewDataTypes;
	isPublicPage: boolean;
	onDeleteClick?: (post: SingleListData[]) => void;
	onMoveOutOfTrashClick?: (post: SingleListData) => void;
	post: SingleListData;
};

export function EditAndDeleteIcons({
	categoryViewsFromProps,
	isPublicPage,
	onDeleteClick,
	onMoveOutOfTrashClick,
	post,
}: EditAndDeleteIconsProps) {
	const [isTrashMenuOpen, setIsTrashMenuOpen] = useState(false);

	const router = useRouter();
	const queryClient = useQueryClient();
	const userId = useSupabaseSession((state) => state.session)?.user?.id ?? "";
	const categorySlug = getCategorySlugFromRouter(router);

	const cardTypeCondition = useGetViewValue(
		"bookmarksView",
		"",
		isPublicPage,
		categoryViewsFromProps,
	) as string;

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const isCategoryOwner =
		!isUserInACategory(categorySlug as string) ||
		find(categoryData?.data, (item) => item?.category_slug === categorySlug)
			?.user_id?.id === userId;

	const isListView = cardTypeCondition === viewValues.list;
	const isStandardView =
		cardTypeCondition === viewValues.moodboard ||
		cardTypeCondition === viewValues.card ||
		cardTypeCondition === viewValues.timeline;

	const canEditAndDelete =
		isCategoryOwner || isBookmarkOwner(post?.user_id, userId);
	const isCreatedByUser = isBookmarkOwner(post?.user_id, userId);

	const trashIcon =
		categorySlug === TRASH_URL ? (
			<ClearTrashDropdown
				isBottomBar={false}
				isClearingTrash={false}
				isOpen={isTrashMenuOpen}
				label="Delete Bookmark"
				menuOpenToggle={(isOpen) => {
					setIsTrashMenuOpen(isOpen);
				}}
				onClearTrash={() => {
					onDeleteClick?.([post]);
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
					className="z-15 hidden rounded-lg bg-whites-700 p-[5px] text-blacks-800 backdrop-blur-xs outline-none group-hover:flex focus-visible:ring-2 focus-visible:ring-blue-500"
					href={post.url}
					rel="noopener noreferrer"
					target="_blank"
				>
					<LinkExternalIcon />
				</a>
			</div>
		);
	}

	if (canEditAndDelete && categorySlug === TRASH_URL) {
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

	if (canEditAndDelete) {
		return (
			<>
				<div
					className={cn("absolute top-0 flex", {
						"left-[-94px]": isListView,
						"left-[15px]": isStandardView,
					})}
				>
					<EditPopover post={post} userId={userId} />
					{isCreatedByUser ? trashIcon : null}
				</div>
				<div className="absolute top-0 right-8">
					<a
						className="z-15 hidden rounded-lg bg-whites-700 p-[5px] text-blacks-800 backdrop-blur-xs group-hover:flex"
						href={post.url}
						rel="noopener noreferrer"
						target="_blank"
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
				className="z-15 hidden rounded-lg bg-whites-700 p-[5px] text-blacks-800 backdrop-blur-xs group-hover:flex"
				href={post.url}
				rel="noopener noreferrer"
				target="_blank"
			>
				<LinkExternalIcon />
			</a>
		</div>
	);
}
