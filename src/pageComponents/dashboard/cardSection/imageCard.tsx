/**
 * ImageCard Component
 *
 * This component handles the display of bookmark images with loading states and error handling.
 * It supports blur-up placeholders using blurhash and shows a loading animation while images load.
 */

import { memo, useState } from "react";
import Image from "next/image";
import { getImgFromArr } from "array-to-image";
import { decode } from "blurhash";
import classNames from "classnames";
import { isEmpty, isNil } from "lodash";

// Assets and utilities
import loaderGif from "../../../../public/loader-gif.gif";
import { useLoadersStore } from "../../../store/componentStore";
import { defaultBlur, viewValues } from "../../../utils/constants";

/**
 * Props for the ImgLogicComponent
 */
type ImgLogicProps = {
	// Image dimensions
	_height: number;
	_width: number;
	// Blurhash URL for progressive image loading
	blurUrl: string | null;
	// Type of the bookmark
	cardTypeCondition: number[] | string[] | string | undefined;
	// Whether to show the cover image
	hasCoverImg: boolean;
	// Unique identifier for the bookmark
	id: number;
	// Source URL of the image
	img: string;
	// Whether the component is rendered on a public page
	isPublicPage: boolean;
	// Sizes attribute for responsive images
	sizesLogic: string;
};

/**
 * Main component for rendering bookmark images with loading and error states
 */
const ImgLogicComponent = ({
	id,
	hasCoverImg,
	img,
	blurUrl,
	cardTypeCondition,
	_height,
	_width,
	sizesLogic,
	isPublicPage,
}: ImgLogicProps) => {
	// image class name for all views
	const imgClassName = classNames({
		"min-h-[48px] min-w-[80px] max-h-[48px] max-w-[80px] object-cover rounded":
			cardTypeCondition === viewValues.list,
		" w-full object-cover rounded-t-lg group-hover:rounded-b-none duration-150 moodboard-card-img aspect-[1.9047]":
			cardTypeCondition === viewValues.card,
		"w-full rounded-t-lg moodboard-card-img min-h-[192px] object-cover":
			cardTypeCondition === viewValues.moodboard ||
			cardTypeCondition === viewValues.timeline,
		"relative z-[-1]":
			cardTypeCondition === viewValues.card ||
			cardTypeCondition === viewValues.moodboard,
	});

	// State and store
	const { loadingBookmarkIds } = useLoadersStore();
	// Tracks which image URL failed to load
	const [errorImg, setErrorImg] = useState<string | null>(null);
	// Whether the current bookmark is being loaded
	const isLoading = loadingBookmarkIds.has(id);

	// Only render if the bookmark has a cover image
	if (hasCoverImg) {
		// Show loading placeholder if data is being fetched
		if (isLoading && isNil(id)) {
			return (
				<LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />
			);
		}

		// Show error placeholder if image failed to load
		if (errorImg === img) {
			return (
				<LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />
			);
		}

		// Generate blur placeholder if blurhash is available
		let blurSource = "";

		if (!isNil(img) && !isNil(blurUrl) && !isEmpty(blurUrl) && !isPublicPage) {
			// Decode blurhash to create a blurry placeholder
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
						height={_height ?? 200}
						key={img}
						onError={() => setErrorImg(img)}
						placeholder="blur"
						sizes={sizesLogic}
						src={`${img}`}
						width={_width ?? 200}
					/>
				) : (
					<LoaderImgPlaceholder cardTypeCondition={cardTypeCondition} id={id} />
				)}
			</>
		);
	}

	return null;
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render when relevant props change
export const ImgLogic = memo(
	ImgLogicComponent,
	(previousProps, nextProps) =>
		previousProps.id === nextProps.id &&
		previousProps.hasCoverImg === nextProps.hasCoverImg &&
		previousProps.img === nextProps.img &&
		previousProps.blurUrl === nextProps.blurUrl &&
		previousProps._height === nextProps._height &&
		previousProps._width === nextProps._width &&
		previousProps.sizesLogic === nextProps.sizesLogic &&
		previousProps.isPublicPage === nextProps.isPublicPage,
);

/**
 * Loading and error state placeholder component
 */
const LoaderImgPlaceholder = ({
	id,
	cardTypeCondition,
}: {
	// Type of the bookmark
	cardTypeCondition: number[] | string[] | string | undefined;
	// Bookmark ID
	id: number;
}) => {
	const { loadingBookmarkIds } = useLoadersStore();
	const isLoading = loadingBookmarkIds.has(id);
	// loader class name for all views
	const loaderClassName = classNames({
		"h-[48px] w-[80px] flex items-center justify-center bg-gray-100 rounded-lg":
			cardTypeCondition === viewValues.list,
		"w-full aspect-[1.9047] flex items-center justify-center bg-gray-100 rounded-lg flex-col gap-2 text-center":
			cardTypeCondition === viewValues.card ||
			cardTypeCondition === viewValues.timeline,
		"w-full aspect-[1.8] flex items-center justify-center bg-gray-100 rounded-lg flex-col gap-2 text-center":
			cardTypeCondition === viewValues.moodboard,
	});
	return (
		<div className={`${loaderClassName}`}>
			<Image
				alt="loading"
				className="h-[50px] w-[50px] rounded-lg object-cover dark:brightness-0 dark:invert"
				loader={(source) => source.src}
				src={loaderGif}
			/>
			{!(cardTypeCondition === viewValues.list) && (
				<p className="text-sm text-gray-900">
					{isLoading
						? "Taking screenshot...."
						: isNil(id)
							? "Fetching data..."
							: "Cannot fetch image for this bookmark"}
				</p>
			)}
		</div>
	);
};
