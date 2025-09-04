import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import Lightbox, { type ZoomRef } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import loaderGif from "../../../public/loader-gif.gif";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import { LightboxCloseIcon } from "../../icons/lightboxCloseIcon";
import { LightboxExternalLink } from "../../icons/lightboxExternalLink";
import { ShowSidePaneButton } from "../../icons/showSidePaneButton";
import {
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../store/componentStore";
import { type CategoriesData, type SingleListData } from "../../types/apiTypes";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	CATEGORY_ID_PATHNAME,
	IMAGE_TYPE_PREFIX,
	PDF_MIME_TYPE,
	PDF_TYPE,
	PDF_VIEWER_PARAMS,
	PREVIEW_ALT_TEXT,
	PREVIEW_PATH,
	VIDEO_TYPE_PREFIX,
	YOUTU_BE,
	YOUTUBE_COM,
} from "../../utils/constants";
import { searchSlugKey } from "../../utils/helpers";
import { getCategorySlugFromRouter } from "../../utils/url";
import { VideoPlayer } from "../VideoPlayer";

import { PullEffect } from "./CloseOnSwipeDown";
import MetaButtonPlugin from "./LightBoxPlugin";
import { type CustomSlide } from "./previewLightBox";

/**
 * CustomLightBox Component
 *
 * A lightbox component that displays various types of media content
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
	bookmarks?: SingleListData[];
	handleClose: () => void;
	isOpen: boolean;
	isPage?: boolean;
	setActiveIndex: (index: number) => void;
}) => {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state?.session);
	const lastInvalidatedIndex = useRef<number | null>(null);
	const isCollectionChanged = useMiscellaneousStore(
		(state) => state.isCollectionChanged,
	);
	const setIsCollectionChanged = useMiscellaneousStore(
		(state) => state.setIsCollectionChanged,
	);
	const router = useRouter();
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	// Next.js router for URL manipulation
	const zoomRef = useRef<ZoomRef>(null);
	const [zoomLevel, setZoomLevel] = useState(1);
	const isMobile =
		typeof window !== "undefined" &&
		window.matchMedia("(max-width: 768px)").matches;

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

		return bookmarks?.map((bookmark) => {
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
						// using || instead of ?? to include 0
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
			const { slide } = slideProps;

			// Find the corresponding bookmark for this slide
			const slideIndex = slides?.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			// Determine if this slide is currently active (visible) for video player
			const isActive = slides?.indexOf(slide) === activeIndex;

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
					<div className=" w-full max-w-[min(1200px,90vw)]">
						<Image
							alt={PREVIEW_ALT_TEXT}
							className="max-h-[80vh] w-auto"
							draggable={false}
							height={bookmark?.meta_data?.height ?? 800}
							priority
							src={
								bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
								bookmark?.meta_data?.isOgImagePreferred
									? bookmark?.ogImage ?? bookmark?.ogimage
									: bookmark?.url ?? ""
							}
							width={bookmark?.meta_data?.width ?? 1_200}
						/>
					</div>
				</div>
			);

			const renderVideoSlide = () => (
				<div className="flex h-full w-full items-center justify-center">
					<div className="w-full max-w-[min(1200px,90vw)]">
						<VideoPlayer isActive={isActive} src={bookmark?.url} />
					</div>
				</div>
			);

			const renderPDFSlide = () => (
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

			const renderYouTubeSlide = () => (
				<div className="relative flex h-full max-h-[80vh] w-full max-w-[min(1200px,90vw)] items-end justify-center">
					<VideoPlayer isActive={isActive} src={bookmark?.url} />
				</div>
			);

			const renderWebEmbedSlide = () => {
				// Only render iframe if this is the active slide and iframe is allowed
				if (bookmark?.meta_data?.iframeAllowed && isActive) {
					return (
						<div className="flex h-full min-h-[500px] w-full max-w-[min(1200px,90vw)] items-end">
							<object
								className="flex h-full max-h-[90vh] w-full items-center justify-center bg-white"
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
				const placeholder = bookmark?.ogImage || bookmark?.ogimage;
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
							<div className=" flex  max-w-[min(1200px,90vw)] items-center justify-center">
								<Image
									alt="Preview"
									className="h-auto max-h-[80vh] w-auto object-contain"
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
								className="h-auto max-h-[80vh] w-auto "
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

			return (
				<div className="slide-wrapper flex h-full w-full items-center justify-center">
					{content}
				</div>
			);
		},
		[bookmarks, slides, activeIndex],
	);

	/**
	 * Custom navigation icons
	 * Left icon: Simple clickable area for previous navigation
	 */
	const iconLeft = () => <div className=" h-[100vh] w-[5vw]" />;

	/**
	 * Right icon: Adjusts margin when side panel is open
	 */
	const iconRight = () => <div className="h-[100vh] w-[5vw]" />;

	const iconSidePane = () => (
		<div className="group h-5 w-5 cursor-pointer text-[rgba(0,0,0,1)] hover:text-black">
			<ShowSidePaneButton />
		</div>
	);

	const isFirstSlide = activeIndex === 0;
	const isLastSlide = activeIndex === bookmarks?.length - 1;
	return (
		<Lightbox
			// Animation configuration for lightbox transitions
			animation={{
				fade: 0,
				zoom: 200,
			}}
			carousel={{ finite: true, preload: 1 }}
			close={handleClose}
			index={activeIndex}
			on={{
				view: ({ index }) => {
					if (!isPage || !bookmarks?.[index]) return;

					const transitionDuration = 200;
					setTimeout(() => {
						setActiveIndex(index);
					}, transitionDuration);

					// Invalidate queries when slide changes
					if (index !== lastInvalidatedIndex.current && isCollectionChanged) {
						const currentBookmark = bookmarks?.[index];
						if (currentBookmark) {
							const categoryId = currentBookmark.category_id;

							// Create a function to handle the async operations
							const invalidateQueries = async () => {
								try {
									if (categoryId) {
										await queryClient.invalidateQueries([
											BOOKMARKS_KEY,
											session?.user?.id,
											categoryId,
										]);
									}

									if (searchText) {
										const categoryData = queryClient.getQueryData([
											CATEGORIES_KEY,
											session?.user?.id,
										]) as {
											data: CategoriesData[];
											error: PostgrestError;
										};

										await queryClient.invalidateQueries([
											BOOKMARKS_KEY,
											session?.user?.id,
											searchSlugKey(categoryData) ?? CATEGORY_ID,
											searchText,
										]);
									}

									await Promise.all([
										queryClient.invalidateQueries([
											BOOKMARKS_COUNT_KEY,
											session?.user?.id,
										]),
									]);

									lastInvalidatedIndex.current = index;
								} catch (error) {
									console.error("Error invalidating queries:", error);
								} finally {
									setIsCollectionChanged(false);
								}
							};

							// Call the async function without awaiting
							void invalidateQueries();
						}
					}

					// Update browser URL
					void router?.push(
						{
							pathname: `${CATEGORY_ID_PATHNAME}`,
							query: {
								category_id: getCategorySlugFromRouter(router),
								id: bookmarks?.[index]?.id,
							},
						},
						`${getCategorySlugFromRouter(router)}${PREVIEW_PATH}/${bookmarks?.[
							index
						]?.id}`,
						{ shallow: true },
					);
				},
				zoom: ({ zoom }) => {
					setZoomLevel(zoom);
				},
			}}
			open={isOpen}
			plugins={[Zoom, MetaButtonPlugin()]}
			render={{
				slide: renderSlide,
				iconNext: () => iconRight(),
				iconPrev: () => iconLeft(),
				buttonPrev:
					slides?.length <= 1 || isFirstSlide || isMobile || zoomLevel !== 1
						? () => null
						: undefined,
				buttonNext:
					slides?.length <= 1 || isLastSlide || isMobile || zoomLevel !== 1
						? () => null
						: undefined,
				buttonZoom: () => null,
				controls: () => <PullEffect enabled={zoomLevel === 1} />,
			}}
			slides={slides}
			styles={{
				navigationNext: { top: "55.1px", transform: "none", padding: "0" },
				navigationPrev: { top: "55.1px", transform: "none", padding: "0" },
				toolbar: {
					position: "absolute",
					top: "0",
					left: "0",
				},
				container: {
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					backdropFilter: "blur(32px)",
					transition: "all 0.2s ease-in-out",
					// Adjust width when side panel is visible
					width: lightboxShowSidepane
						? "calc(100% - min(max(320px, 20%), 400px))"
						: "100%",
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
					// Left: Close button
					<div className="flex items-center" key="left-section">
						<button
							className="group ml-4 mt-3.5 flex items-center justify-center rounded-full"
							onClick={handleClose}
							type="button"
						>
							<LightboxCloseIcon />
						</button>
					</div>,

					// Center: Bookmark URL (flex: 1 ensures centering)
					<div
						className="flex flex-1 justify-center  pt-[9px] text-center"
						key="center-section"
					>
						<a
							className="flex max-w-[300px] items-center gap-2 overflow-hidden rounded-lg  px-[13px] py-[7px] text-[14px] leading-[115%] tracking-[0] hover:bg-[rgba(0,0,0,0.03)]"
							href={bookmarks?.[activeIndex]?.url}
							key="center-section"
							rel="noreferrer"
							target="_blank"
						>
							<span className="truncate text-[#707070]">
								{bookmarks?.[activeIndex]?.url?.replace(/^https?:\/\//u, "")}
							</span>
							<div className="h-4 w-4 shrink-0">
								<LightboxExternalLink />
							</div>
						</a>
					</div>,

					// Right: Side pane toggle button
					<div className="flex items-center pr-4 pt-[7px]" key="right-section">
						<button
							onClick={() => setLightboxShowSidepane(!lightboxShowSidepane)}
							type="button"
						>
							{iconSidePane()}
						</button>
					</div>,
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
		const host = url?.hostname;

		// Match video URLs only
		if (host === YOUTU_BE) {
			return Boolean(url?.pathname?.slice(1));
		}

		if (host === `www.${YOUTUBE_COM}` || host === YOUTUBE_COM) {
			if (url?.pathname === "/watch" && url?.searchParams.has("v")) {
				return true;
			}

			if (url?.pathname?.startsWith(`/embed/`)) {
				return true;
			}

			if (
				url?.pathname?.startsWith("/shorts/") &&
				url?.pathname?.split("/")[2]
			) {
				return true;
			}
		}

		return false;
	} catch {
		return false;
	}
};
