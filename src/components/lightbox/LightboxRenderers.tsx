import { useCallback, useEffect, useState, type RefObject } from "react";
import Image from "next/image";
import { type ZoomRef } from "yet-another-react-lightbox";

import loaderGif from "../../../public/loader-gif.gif";
import { useIframeStore } from "../../store/iframeStore";
import { type SingleListData } from "../../types/apiTypes";
import {
	IMAGE_TYPE_PREFIX,
	PDF_MIME_TYPE,
	PDF_VIEWER_PARAMS,
	PREVIEW_ALT_TEXT,
	tweetType,
} from "../../utils/constants";
import { VideoPlayer } from "../VideoPlayer";

interface SlideProps {
	bookmark: SingleListData | undefined;
	// eslint-disable-next-line react/no-unused-prop-types
	isActive?: boolean;
	// eslint-disable-next-line react/no-unused-prop-types
	zoomRef?: RefObject<ZoomRef | null>;
}

/**
 * Renders an image slide with zoom capabilities
 * Handles double-click to zoom in/out
 */
export const ImageSlide = ({ bookmark, zoomRef }: SlideProps) => (
	<div
		className="flex items-center justify-center"
		onDoubleClick={(event) => {
			event.stopPropagation();
			if (!zoomRef?.current) {
				return;
			}

			if (zoomRef?.current?.zoom > 1) {
				zoomRef?.current?.zoomOut();
			} else {
				zoomRef?.current?.zoomIn();
			}
		}}
	>
		<div className="w-full max-w-[min(1200px,90vw)]">
			<Image
				alt={PREVIEW_ALT_TEXT}
				className="max-h-[80vh] w-auto"
				draggable={false}
				height={bookmark?.meta_data?.height ?? 800}
				priority
				src={
					bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
					bookmark?.meta_data?.isOgImagePreferred
						? bookmark?.ogImage
						: (bookmark?.url ?? "")
				}
				width={bookmark?.meta_data?.width ?? 1_200}
			/>
		</div>
	</div>
);

/**
 * Renders a video slide using the custom VideoPlayer component
 * Falls back to ogImage if video fails to load (e.g., 403 errors)
 */
export const VideoSlide = ({ bookmark, isActive, zoomRef }: SlideProps) => {
	const [videoError, setVideoError] = useState(false);

	// Reset error state when bookmark changes
	useEffect(() => {
		setVideoError(false);
	}, [bookmark?.url]);

	const handleVideoError = useCallback(() => {
		setVideoError(true);
	}, []);

	// If video failed to load and we have an ogImage, show the image instead
	if (videoError && bookmark?.ogImage) {
		return <WebEmbedSlide bookmark={bookmark} zoomRef={zoomRef} />;
	}

	return (
		<div className="flex h-full w-full items-center justify-center">
			<div className="w-full max-w-[min(1200px,90vw)]">
				<VideoPlayer
					isActive={isActive ?? false}
					onError={handleVideoError}
					src={
						(bookmark?.type === tweetType || bookmark?.type === "instagram") &&
						bookmark?.meta_data?.video_url
							? bookmark?.meta_data?.video_url
							: (bookmark?.url ?? "")
					}
				/>
			</div>
		</div>
	);
};

/**
 * Renders a PDF slide using an embedded object tag
 * Fallback to download link if display fails
 */
export const PDFSlide = ({ bookmark }: SlideProps) => (
	<div className="flex h-full w-full max-w-[min(1200px,90vw)] items-end">
		{/* not using external package to keep our approach native, does not embed pdf in chrome app  */}
		{typeof window !== "undefined" ? (
			<object
				aria-label="PDF Viewer"
				className="h-full max-h-[90vh] w-full"
				data={`${bookmark?.url}${PDF_VIEWER_PARAMS}`}
				type={PDF_MIME_TYPE}
			>
				<div className="p-4 text-center">
					<p className="text-gray-700">
						This PDF cannot be displayed in your browser.
					</p>
					<a
						className="text-blue-600 underline"
						href={bookmark?.url}
						rel="noopener noreferrer"
						target="_blank"
					>
						Click here to download it instead
					</a>
				</div>
			</object>
		) : null}
	</div>
);

/**
 * Renders a YouTube video slide
 */
export const YouTubeSlide = ({ bookmark, isActive }: SlideProps) => (
	<div className="relative flex h-full max-h-[80vh] w-full max-w-[min(1200px,90vw)] items-end justify-center">
		<VideoPlayer isActive={isActive ?? false} src={bookmark?.url ?? ""} />
	</div>
);

/**
 * Renders a web embed or placeholder for non-embeddable content
 * Handles iframe permissions and fallback image rendering
 */
export const WebEmbedSlide = ({ bookmark, isActive, zoomRef }: SlideProps) => {
	const iframeEnabled = useIframeStore((state) => state.iframeEnabled);
	// Only render iframe if this is the active slide and iframe is allowed
	if (bookmark?.meta_data?.iframeAllowed && isActive && iframeEnabled) {
		return (
			<div className="flex h-full min-h-[500px] w-full max-w-[min(1200px,90vw)] items-end">
				<object
					className="flex h-full max-h-[90vh] w-full items-center justify-center bg-gray-0"
					data={bookmark?.url}
					title="Website Preview"
					type="text/html"
				>
					<div className="p-4 text-center">
						<p className="text-gray-700">
							This website cannot be displayed in the lightbox.
						</p>
						<a
							className="text-blue-600 underline"
							href={bookmark?.url}
							rel="noopener noreferrer"
							target="_blank"
						>
							Click here to view it in a new tab
						</a>
					</div>
				</object>
			</div>
		);
	}

	// Check if we have a placeholder to show
	const placeholder = bookmark?.ogImage;
	if (placeholder) {
		const placeholderHeight = bookmark?.meta_data?.height ?? 800;
		const placeholderWidth = bookmark?.meta_data?.width ?? 1_200;

		// Check if this is a screenshot URL (may need special scaling)
		const is2xScreenshot = bookmark?.meta_data?.isPageScreenshot;

		// Apply 50% scaling to screenshots to make them more manageable
		const scaledWidth = is2xScreenshot
			? placeholderWidth * 0.5
			: placeholderWidth;
		const scaledHeight = is2xScreenshot
			? placeholderHeight * 0.5
			: placeholderHeight;

		// Check if image dimensions exceed reasonable display limits
		const exceedsWidth = scaledWidth >= 1_200;
		const underHeight =
			scaledHeight >=
			(typeof window !== "undefined" ? window?.innerHeight * 0.8 : 0);

		// Render constrained image when dimensions are too large
		if (exceedsWidth || underHeight) {
			return (
				<div className="flex max-w-[min(1200px,90vw)] items-center justify-center">
					<Image
						alt="Preview"
						className="h-auto max-h-[80vh] w-auto object-contain"
						draggable={false}
						height={placeholderHeight}
						onDoubleClick={(event) => {
							const img = event?.currentTarget;
							const containerWidth = img?.clientWidth;
							const containerHeight = img?.clientHeight;
							const imageAspectRatio = img?.naturalWidth / img?.naturalHeight;
							const containerAspectRatio = containerWidth / containerHeight;

							let renderedHeight;
							let renderedWidth;
							if (imageAspectRatio > containerAspectRatio) {
								renderedWidth = containerWidth;
								renderedHeight = containerWidth / imageAspectRatio;
							} else {
								renderedHeight = containerHeight;
								renderedWidth = containerHeight * imageAspectRatio;
							}

							const offsetX = (containerWidth - renderedWidth) / 2;
							const offsetY = (containerHeight - renderedHeight) / 2;
							const clickX = event?.nativeEvent?.offsetX;
							const clickY = event?.nativeEvent?.offsetY;

							const insideVisibleImage =
								clickX >= offsetX &&
								clickX <= offsetX + renderedWidth &&
								clickY >= offsetY &&
								clickY <= offsetY + renderedHeight;

							if (!insideVisibleImage) {
								return;
							}

							event?.stopPropagation();
							const zoom = zoomRef?.current;
							if (!zoom) {
								return;
							}

							if (zoom?.zoom > 1) {
								zoom?.zoomOut();
							} else {
								zoom?.zoomIn();
							}
						}}
						priority
						src={placeholder}
						width={placeholderWidth}
					/>
				</div>
			);
		}

		return (
			<div
				className={`flex min-h-screen origin-center items-center justify-center ${
					is2xScreenshot ? "scale-50" : ""
				}`}
			>
				<Image
					alt="Preview"
					className="h-auto max-h-[80vh] w-auto"
					draggable={false}
					height={scaledHeight}
					onDoubleClick={(event) => {
						event?.stopPropagation();
						const zoom = zoomRef?.current;
						if (!zoom) {
							return;
						}

						if (zoom?.zoom > 1) {
							zoom?.zoomOut();
						} else {
							zoom?.zoomIn();
						}
					}}
					priority
					src={placeholder}
					width={scaledWidth}
				/>
			</div>
		);
	}

	return (
		<Image
			alt="Loading placeholder"
			className="h-[50px] w-[50px] rounded-lg object-cover"
			loader={(source) => source.src}
			src={loaderGif}
		/>
	);
};
