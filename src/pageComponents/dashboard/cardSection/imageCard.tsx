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
import { isEmpty, isNil } from "lodash";

// Assets and utilities
import loaderGif from "../../../../public/loader-gif.gif";
import { useLoadersStore } from "../../../store/componentStore";
import { defaultBlur } from "../../../utils/constants";

/**
 * Props for the ImgLogicComponent
 */
type ImgLogicProps = {
	// Image dimensions
	_height: number;
	_width: number;
	// Blurhash URL for progressive image loading
	blurUrl: string | null;
	// Whether to show the cover image
	hasCoverImg: boolean;
	// Unique identifier for the bookmark
	id: number;
	// Source URL of the image
	img: string;
	// CSS class for the image
	imgClassName: string;
	// Whether the bookmark data is currently loading
	isBookmarkLoading: boolean;
	// Whether the component is rendered on a public page
	isPublicPage: boolean;
	// CSS class for the loader
	loaderClassName: string;
	// Sizes attribute for responsive images
	sizesLogic: string;
};

/**
 * Main component for rendering bookmark images with loading and error states
 */
const ImgLogicComponent = ({
	id,
	isBookmarkLoading,
	hasCoverImg,
	img,
	blurUrl,
	imgClassName,
	_height,
	_width,
	sizesLogic,
	isPublicPage,
	loaderClassName,
}: ImgLogicProps) => {
	// State and store
	const { loadingBookmarkIds } = useLoadersStore();
	// Tracks which image URL failed to load
	const [errorImg, setErrorImg] = useState<string | null>(null);
	// Whether the current bookmark is being loaded
	const isLoading = loadingBookmarkIds.has(id);

	// Only render if the bookmark has a cover image
	if (hasCoverImg) {
		// Show loading placeholder if data is being fetched
		if ((isBookmarkLoading || isLoading) && isNil(id)) {
			return (
				<LoaderImgPlaceholder
					id={id}
					isBookmarkLoading={isBookmarkLoading}
					loaderClassName={loaderClassName}
				/>
			);
		}

		// Show error placeholder if image failed to load
		if (errorImg === img) {
			return (
				<LoaderImgPlaceholder
					id={id}
					isBookmarkLoading={isBookmarkLoading}
					loaderClassName={loaderClassName}
				/>
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
					<LoaderImgPlaceholder
						id={id}
						isBookmarkLoading={isBookmarkLoading}
						loaderClassName={loaderClassName}
					/>
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
		previousProps.isBookmarkLoading === nextProps.isBookmarkLoading &&
		previousProps.hasCoverImg === nextProps.hasCoverImg &&
		previousProps.img === nextProps.img &&
		previousProps.blurUrl === nextProps.blurUrl &&
		previousProps.imgClassName === nextProps.imgClassName &&
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
	isBookmarkLoading,
	loaderClassName,
}: {
	// Bookmark ID
	id: number;
	// Whether the bookmark is currently loading
	isBookmarkLoading: boolean;
	// CSS class for the loader
	loaderClassName: string;
}) => {
	const { loadingBookmarkIds } = useLoadersStore();
	const isLoading = loadingBookmarkIds.has(id);

	return (
		<div className={`${loaderClassName} flex flex-col items-center gap-2`}>
			<Image
				alt="loading"
				className="h-[50px] w-[50px] rounded-lg object-cover"
				src={loaderGif}
			/>
			<p className="text-sm text-gray-600">
				{isLoading
					? "Taking screenshot...."
					: isBookmarkLoading || isNil(id)
					? "Fetching data..."
					: "Cannot fetch image for this bookmark"}
			</p>
		</div>
	);
};
