import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Lightbox, { type ZoomRef } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import loaderGif from "../../../public/loader-gif.gif";
import { MetaDataIcon } from "../../icons/metaData";
import { useMiscellaneousStore } from "../../store/componentStore";
import {
	type ImgMetadataType,
	type SingleListData,
} from "../../types/apiTypes";
import {
	CATEGORY_ID_PATHNAME,
	IMAGE_TYPE_PREFIX,
	LIGHTBOX_CLOSE_BUTTON,
	LIGHTBOX_SHOW_PANE_BUTTON,
	PDF_MIME_TYPE,
	PDF_TYPE,
	PDF_VIEWER_PARAMS,
	PREVIEW_ALT_TEXT,
	PREVIEW_PATH,
	SCREENSHOT_URL,
	VIDEO_TYPE_PREFIX,
	YOUTU_BE,
	YOUTUBE_COM,
} from "../../utils/constants";
import { getCategorySlugFromRouter } from "../../utils/url";
import { VideoPlayer } from "../VideoPlayer";

import MetaButtonPlugin from "./LightBoxPlugin";
import { type CustomSlide } from "./previewLightBox";

/**
 * Bookmark type definition - extends SingleListData but omits certain fields
 * and adds optional properties for creation date, domain, and metadata
 */
export type Bookmark = Omit<
	SingleListData,
	"addedTags" | "inserted_at" | "trash" | "user_id"
> & {
	createdAt?: string;
	domain?: string;
	meta_data?: Partial<ImgMetadataType>;
};

/**
 * CustomLightBox Component
 *
 * A  lightbox component that displays various types of media content
 * including images, videos, PDFs, and embedded web content. Features include:
 * - Zoom functionality for images
 * - Video playback support (including YouTube)
 * - PDF viewing with embedded viewer
 * - Side panel toggle for metadata
 * - Navigation between bookmarks
 * - URL routing integration for shareable links
 */
export const CustomLightBox = ({
	bookmarks = [],
	activeIndex,
	setActiveIndex,
	isOpen,
	handleClose: originalHandleClose,
	isPage,
}: {
	activeIndex: number;
	bookmarks?: Bookmark[];
	handleClose: () => void;
	isOpen: boolean;
	isPage?: boolean;
	setActiveIndex: (index: number) => void;
}) => {
	// Next.js router for URL manipulation
	const router = useRouter();
	const zoomRef = useRef<ZoomRef>(null);
	const [placeholderError, setPlaceholderError] = useState(false);
	// Zustand store hooks for managing lightbox side panel state
	const setLightboxShowSidepane = useMiscellaneousStore(
		(state) => state?.setLightboxShowSidepane,
	);
	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state?.lightboxShowSidepane,
	);

	/**
	 * Enhanced close handler that also resets the side panel state
	 * Uses useCallback to prevent unnecessary re-renders
	 */
	const handleClose = useCallback(() => {
		originalHandleClose();
		setLightboxShowSidepane(false);
	}, [originalHandleClose, setLightboxShowSidepane]);

	/**
	 * Transforms bookmark data into lightbox slide format
	 * Determines media type and sets appropriate properties for each slide
	 * Memoized to prevent recalculation on every render
	 */
	const slides = useMemo(() => {
		if (!bookmarks) return [];

		return bookmarks.map((bookmark) => {
			// Determine media types based on bookmark properties
			const isImage =
				bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
				bookmark?.meta_data?.isOgImagePreferred ||
				bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX);
			const isVideo = bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX);

			return {
				src: bookmark?.url,
				// Set slide type for lightbox to handle appropriately
				type: isVideo
					? VIDEO_TYPE_PREFIX
					: isImage
					? IMAGE_TYPE_PREFIX
					: undefined,

				// Only include dimensions if not a PDF or not a YouTube video
				...(bookmark?.meta_data?.mediaType !== PDF_MIME_TYPE &&
					!bookmark?.type?.includes(PDF_TYPE) &&
					!isYouTubeVideo(bookmark?.url) &&
					!bookmark?.meta_data?.iframeAllowed && {
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
						width: bookmark?.meta_data?.width || 1_200,
						// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
						height: bookmark?.meta_data?.height || 1_200,
					}),
				// Add video-specific properties
				...(isVideo && {
					sources: [
						{
							src: bookmark?.url,
							type: bookmark?.type ?? VIDEO_TYPE_PREFIX,
						},
					],
				}),
			};
		}) as CustomSlide[];
	}, [bookmarks]);
	/**
	 * Custom slide renderer that handles different media types
	 * - Images: Direct display with Next.js Image component
	 * - Videos: Custom VideoPlayer component
	 * - PDFs: Embedded PDF viewer
	 * - Web content: EmbedWithFallback component
	 * - YouTube: Special handling for YouTube URLs
	 */
	const renderSlide = useCallback(
		(slideProps: { offset: number; slide: CustomSlide }) => {
			const { offset, slide } = slideProps;

			// Find the corresponding bookmark for this slide
			const slideIndex = slides?.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			// Determine if this slide is currently active (visible) for video player
			const isActive = offset === 0;

			const renderImageSlide = () => (
				<div
					className="flex items-center justify-center"
					onDoubleClick={(event) => {
						event.stopPropagation();
						if (!zoomRef?.current) return;

						if (zoomRef?.current?.zoom > 1) {
							zoomRef?.current?.zoomOut();
						} else {
							zoomRef?.current?.zoomIn();
						}
					}}
				>
					<div className="relative max-w-[1200px]">
						<Image
							alt={PREVIEW_ALT_TEXT}
							className="max-h-[80vh] w-auto"
							draggable={false}
							height={bookmark?.meta_data?.height ?? 800}
							priority
							src={
								bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
								bookmark?.meta_data?.isOgImagePreferred
									? bookmark?.ogImage ?? ""
									: bookmark?.url
							}
							width={bookmark?.meta_data?.width ?? 1_200}
						/>
					</div>
				</div>
			);

			const renderVideoSlide = () => (
				<div className="flex h-full w-full items-center justify-center">
					<div className="w-full max-w-4xl">
						<VideoPlayer isActive={isActive} src={bookmark?.url} />
					</div>
				</div>
			);

			const renderPDFSlide = () => (
				<div className="relative flex h-full w-full max-w-[1200px] items-center justify-center">
					<div className="flex h-full w-full items-center justify-center">
						{/* not using external package to keep our approach native, does not embed pdf in chrome app  */}
						{typeof window !== "undefined" ? (
							<object
								aria-label="PDF Viewer"
								className="block h-full w-full border-none"
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
				</div>
			);

			const renderYouTubeSlide = () => (
				<div className="flex h-full w-full max-w-[1200px] items-center justify-center">
					<VideoPlayer isActive={isActive} src={bookmark?.url} />
				</div>
			);

			const renderWebEmbedSlide = () => {
				if (bookmark?.meta_data?.iframeAllowed) {
					return (
						<div className="h-full min-h-[500px] w-full max-w-[1200px]">
							{typeof window !== "undefined" ? (
								<object
									className="h-full w-full"
									data={bookmark?.url}
									title="Website Preview"
									type="text/html"
								/>
							) : null}
						</div>
					);
				}

				// Check if we have a placeholder to show
				const placeholder = bookmark?.ogImage;
				if (placeholder && !placeholderError) {
					const placeholderHeight = bookmark?.meta_data?.height ?? 800;
					const placeholderWidth = bookmark?.meta_data?.width ?? 1_200;

					// Check if this is a screenshot URL (may need special scaling)
					const isScreenshot = placeholder?.startsWith(SCREENSHOT_URL);

					// Apply 50% scaling to screenshots to make them more manageable
					const scaledWidth = isScreenshot
						? placeholderWidth * 0.5
						: placeholderWidth;
					const scaledHeight = isScreenshot
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
							<div className="flex max-h-[80vh] max-w-[1200px] items-center justify-center">
								<Image
									alt="Preview"
									className="object-contain"
									draggable={false}
									height={placeholderHeight}
									onDoubleClick={(event) => {
										const img = event?.currentTarget;
										const containerWidth = img?.clientWidth;
										const containerHeight = img?.clientHeight;
										const imageAspectRatio =
											img?.naturalWidth / img?.naturalHeight;
										const containerAspectRatio =
											containerWidth / containerHeight;

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

										if (!insideVisibleImage) return;

										event?.stopPropagation();
										const zoom = zoomRef?.current;
										if (!zoom) return;

										if (zoom?.zoom > 1) {
											zoom?.zoomOut();
										} else {
											zoom?.zoomIn();
										}
									}}
									onError={() => setPlaceholderError(true)}
									priority
									src={placeholder}
									width={placeholderWidth}
								/>
							</div>
						);
					}

					return (
						<div
							className={`flex   min-h-screen   origin-center items-center justify-center ${
								isScreenshot ? "scale-50" : ""
							}`}
						>
							<Image
								alt="Preview"
								className="h-auto w-auto"
								draggable={false}
								height={scaledHeight}
								onDoubleClick={(event) => {
									event?.stopPropagation();
									const zoom = zoomRef?.current;
									if (!zoom) return;

									if (zoom?.zoom > 1) {
										zoom?.zoomOut();
									} else {
										zoom?.zoomIn();
									}
								}}
								onError={() => setPlaceholderError(true)}
								priority
								src={placeholder}
								width={scaledWidth}
							/>
						</div>
					);
				}

				return (
					<Image
						alt="img-error"
						className="h-[50px] w-[50px] rounded-lg object-cover"
						src={loaderGif}
					/>
				);
			};

			let content = null;

			if (
				bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
				bookmark?.meta_data?.isOgImagePreferred ||
				bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX)
			) {
				content = renderImageSlide();
			} else if (
				bookmark?.meta_data?.mediaType?.startsWith(VIDEO_TYPE_PREFIX) ||
				bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX)
			) {
				content = renderVideoSlide();
			} else if (
				bookmark?.meta_data?.mediaType === PDF_MIME_TYPE ||
				bookmark?.type?.includes(PDF_TYPE)
			) {
				content = renderPDFSlide();
			} else if (isYouTubeVideo(bookmark?.url)) {
				content = renderYouTubeSlide();
			} else if (bookmark?.url) {
				content = renderWebEmbedSlide();
			}

			// content wrapper
			return (
				<div className="flex h-full w-full items-center justify-center">
					{content}
				</div>
			);
		},
		[bookmarks, slides, placeholderError],
	);

	/**
	 * Custom navigation icons
	 * Left icon: Simple clickable area for previous navigation
	 */
	const iconLeft = () => <div className=" h-[50vh] w-[150px] cursor-pointer" />;

	/**
	 * Right icon: Adjusts margin when side panel is open
	 */
	const iconRight = () => (
		<div
			className={`h-[50vh] w-[150px] ${lightboxShowSidepane ? "mr-80" : ""}`}
		/>
	);

	const isFirstSlide = activeIndex === 0;
	const isLastSlide = activeIndex === bookmarks.length - 1;
	return (
		<Lightbox
			// Animation configuration for lightbox transitions
			animation={{
				fade: 0,
				zoom: 200,
			}}
			carousel={{ finite: true }}
			close={handleClose}
			index={activeIndex}
			on={{
				// Handle slide view changes and update URL for shareable links
				view: ({ index }) => {
					if (!isPage || !bookmarks?.[index]) return;
					setActiveIndex(index);
					// Update browser URL to make lightbox state shareable
					void router.push(
						{
							pathname: `/${CATEGORY_ID_PATHNAME}`,
							query: {
								category_id: getCategorySlugFromRouter(router),
								id: bookmarks?.[index]?.id,
							},
						},
						`${getCategorySlugFromRouter(router)}${PREVIEW_PATH}/${bookmarks?.[
							index
						]?.id}`,
						{
							// Don't trigger a full page reload
							shallow: true,
						},
					);
				},
			}}
			open={isOpen}
			plugins={[Zoom, MetaButtonPlugin()]}
			render={{
				slide: renderSlide,
				iconNext: () => iconRight(),
				iconPrev: () => iconLeft(),
				buttonPrev: slides.length <= 1 || isFirstSlide ? () => null : undefined,
				buttonNext: slides.length <= 1 || isLastSlide ? () => null : undefined,
				buttonZoom: () => null,
			}}
			slides={slides}
			styles={{
				container: {
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					backdropFilter: "blur(32px)",
					transition: "all 0.2s ease-in-out",
					// Adjust width when side panel is visible
					width: lightboxShowSidepane ? "80%" : "100%",
					animation: "customFadeScaleIn 0.25s ease-in-out",
				},
				slide: {
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				},
			}}
			toolbar={{
				buttons: [
					// Metadata panel toggle button
					<button
						className="flex items-center gap-2 text-gray-500 transition hover:text-gray-700"
						key={LIGHTBOX_SHOW_PANE_BUTTON}
						onClick={() => setLightboxShowSidepane(!lightboxShowSidepane)}
						type="button"
					>
						<MetaDataIcon />
					</button>,
					// Standard close button
					LIGHTBOX_CLOSE_BUTTON,
				],
			}}
			zoom={{ ref: zoomRef, doubleClickDelay: 100, maxZoomPixelRatio: 100 }}
		/>
	);
};

const isYouTubeVideo = (urlString: string | null | undefined): boolean => {
	if (!urlString) return false;

	try {
		const url = new URL(urlString);
		const host = url.hostname;

		// Match video URLs only
		if (host === YOUTU_BE) {
			return Boolean(url.pathname.slice(1));
		}

		if (host === `www.${YOUTUBE_COM}` || host === YOUTUBE_COM) {
			if (url.pathname === "/watch" && url.searchParams.has("v")) {
				return true;
			}

			if (url.pathname.startsWith(`/embed/`)) {
				return true;
			}

			if (url.pathname.startsWith("/shorts/") && url.pathname.split("/")[2]) {
				return true;
			}
		}

		return false;
	} catch {
		return false;
	}
};
