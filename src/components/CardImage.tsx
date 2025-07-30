import React, { useState } from "react";
import Image from "next/image";
import { getImgFromArr } from "array-to-image";
import { decode } from "blurhash";
import { isEmpty, isNil } from "lodash";

type CardImageProps = {
	blurUrl: string | null;
	defaultBlur: string;
	errorImgPlaceholder: (isError: boolean) => React.ReactNode;
	errorImgs: Array<number | string>;
	hasCoverImg?: boolean;
	height: number | null;
	id: number | string | undefined;
	img: string | undefined;
	imgClassName: string;
	isAllBookmarksDataFetching: number;
	isBookmarkLoading: boolean;
	isLoading: boolean;
	isOgImgLoading: boolean;
	isPublicPage: boolean;
	setErrorImgs: (imgs: Array<number | string>) => void;
	width: number | null;
};

const CardImage: React.FC<CardImageProps> = ({
	hasCoverImg,
	isBookmarkLoading,
	isAllBookmarksDataFetching,
	isOgImgLoading,
	id,
	isLoading,
	img,
	errorImgs,
	setErrorImgs,
	blurUrl,
	isPublicPage,
	defaultBlur,
	imgClassName,
	height,
	width,
	errorImgPlaceholder,
}) => {
	const [clientLoading, setClientLoading] = useState(true);

	if (!hasCoverImg) return null;

	// Still block if loading AND no ID (invalid state)
	if (
		(isBookmarkLoading || isAllBookmarksDataFetching || isOgImgLoading) &&
		isNil(id)
	) {
		return <>{errorImgPlaceholder(false)}</>;
	}

	if (isLoading && !img) {
		return <>{errorImgPlaceholder(false)}</>;
	}

	if (errorImgs?.includes(id as never)) {
		return <>{errorImgPlaceholder(false)}</>;
	}

	let blurSource = "";
	if (!isNil(img) && !isNil(blurUrl) && !isEmpty(blurUrl) && !isPublicPage) {
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
					onLoad={() => setClientLoading(false)}
					placeholder="blur"
					src={img}
					width={width ?? 200}
				/>
			) : (
				errorImgPlaceholder(false)
			)}
			{/* Optional: placeholder overlay while clientLoading */}
			{clientLoading && errorImgPlaceholder(false)}
		</>
	);
};

export default CardImage;
