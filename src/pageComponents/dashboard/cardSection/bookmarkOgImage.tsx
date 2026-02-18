import { useMemo } from "react";
import classNames from "classnames";

import useGetViewValue from "@/hooks/useGetViewValue";
import PlayIcon from "@/icons/actionIcons/playIcon";
import {
	type BookmarkViewDataTypes,
	type SingleListData,
} from "@/types/apiTypes";
import { viewValues } from "@/utils/constants";
import { isBookmarkAudio, isBookmarkVideo } from "@/utils/helpers";

import { ImgLogic } from "./imageCard";

export type BookmarkOgImageProps = {
	categoryViewsFromProps?: BookmarkViewDataTypes;
	img: SingleListData["ogImage"];
	isLoading: boolean;
	isPublicPage: boolean;
	post: SingleListData;
};

export function BookmarkOgImage({
	categoryViewsFromProps,
	img,
	isLoading,
	isPublicPage,
	post,
}: BookmarkOgImageProps) {
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
	);

	const hasCoverImg = (bookmarksInfoValue as string[] | undefined)?.includes(
		"cover",
	);

	const sizesLogic = useMemo(() => {
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

	const isVideo = isBookmarkVideo(post.type);
	const isAudio = isBookmarkAudio(post.type);

	const figureClassName = classNames({
		"relative z-[-1]": isAudio || isVideo,
		"h-[48px] w-[80px] mr-3": cardTypeCondition === viewValues.list,
		"w-full shadow-custom-8 rounded-lg group-hover:rounded-b-none":
			cardTypeCondition === viewValues.card ||
			cardTypeCondition === viewValues.moodboard,
		"aspect-[1.8]":
			cardTypeCondition === viewValues.moodboard &&
			isLoading &&
			img === undefined,
	});

	const playSvgClassName = classNames({
		"hover:fill-slate-500 transition ease-in-out fill-gray-800": true,
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
					_height={post.meta_data?.height ?? 200}
					_width={post.meta_data?.width ?? 200}
					blurUrl={post.meta_data?.ogImgBlurUrl ?? ""}
					cardTypeCondition={cardTypeCondition}
					hasCoverImg={hasCoverImg ?? false}
					id={post.id}
					img={img}
					isPublicPage={isPublicPage}
					sizesLogic={sizesLogic}
				/>
			</figure>
		</div>
	);
}
