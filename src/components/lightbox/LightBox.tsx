import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lightbox, { type ZoomRef } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { LightboxCloseIcon } from "../../icons/lightboxCloseIcon";
import { LightboxExternalLink } from "../../icons/lightboxExternalLink";
import { ShowSidePaneButton } from "../../icons/showSidePaneButton";
import { useMiscellaneousStore } from "../../store/componentStore";
import { type SingleListData } from "../../types/apiTypes";
import {
	IMAGE_TYPE_PREFIX,
	PDF_MIME_TYPE,
	PDF_TYPE,
	VIDEO_TYPE_PREFIX,
} from "../../utils/constants";

import { PullEffect } from "./CloseOnSwipeDown";
import MetaButtonPlugin from "./LightBoxPlugin";
import {
	ImageSlide,
	PDFSlide,
	VideoSlide,
	WebEmbedSlide,
	YouTubeSlide,
} from "./LightboxRenderers";
import { isYouTubeVideo } from "./LightboxUtils";
import { useLightboxNavigation, useLightboxSlides } from "./useLightboxLogic";
import { type CustomSlide } from "@/types/componentStoreTypes";

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
	// Zustand store hooks for managing lightbox side panel state
	const setLightboxShowSidepane = useMiscellaneousStore(
		(state) => state?.setLightboxShowSidepane,
	);
	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state?.lightboxShowSidepane,
	);

	const zoomRef = useRef<ZoomRef>(null);
	const [zoomLevel, setZoomLevel] = useState(1);
	const isMobile =
		typeof window !== "undefined" &&
		window.matchMedia("(max-width: 768px)").matches;

	// Restore side panel state from local storage
	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const storedState = localStorage.getItem("lightboxSidepaneOpen");
		if (storedState !== null) {
			setLightboxShowSidepane(storedState === "true");
		}
	}, [setLightboxShowSidepane]);

	/**
	 * Enhanced close handler that also resets the side panel state
	 * Uses useCallback to prevent unnecessary re-renders
	 */
	const handleClose = useCallback(() => {
		originalHandleClose();
		setLightboxShowSidepane(false);
	}, [originalHandleClose, setLightboxShowSidepane]);

	// Transform bookmarks into slides using custom hook
	const slides = useLightboxSlides(bookmarks);

	// Handle navigation, query invalidation and URL updates using custom hook
	const onViewRef = useLightboxNavigation({
		activeIndex,
		bookmarks,
		isPage,
		setActiveIndex,
	});

	/**
	 * Custom slide renderer that handles different media types
	 * Delegates rendering to specific components based on media type
	 */
	const renderSlide = useCallback(
		(slideProps: { offset: number; slide: CustomSlide }) => {
			const { slide } = slideProps;

			// Find the corresponding bookmark for this slide
			const slideIndex = slides?.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) {
				return null;
			}

			// Determine if this slide is currently active (visible) for video player
			const isActive = slides?.indexOf(slide) === activeIndex;

			let content = null;

			// Check video FIRST
			if (
				bookmark?.meta_data?.mediaType?.startsWith(VIDEO_TYPE_PREFIX) ||
				bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX) ||
				Boolean(bookmark?.meta_data?.video_url)
			) {
				content = <VideoSlide bookmark={bookmark} isActive={isActive} />;
			}
			// Then check image
			else if (
				bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
				bookmark?.meta_data?.isOgImagePreferred ||
				bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX)
			) {
				content = <ImageSlide bookmark={bookmark} zoomRef={zoomRef} />;
			} else if (
				bookmark?.meta_data?.mediaType === PDF_MIME_TYPE ||
				bookmark?.type?.includes(PDF_TYPE)
			) {
				content = <PDFSlide bookmark={bookmark} />;
			} else if (isYouTubeVideo(bookmark?.url)) {
				content = <YouTubeSlide bookmark={bookmark} isActive={isActive} />;
			} else if (bookmark?.url) {
				content = (
					<WebEmbedSlide
						bookmark={bookmark}
						isActive={isActive}
						zoomRef={zoomRef}
					/>
				);
			}

			return (
				<button
					className="slide-wrapper flex h-full w-full cursor-default items-center justify-center"
					onClick={(event) => {
						if (event.currentTarget === event.target) {
							handleClose();
						}
					}}
					type="button"
				>
					{content}
				</button>
			);
		},
		[bookmarks, slides, activeIndex, handleClose],
	);

	/**
	 * Custom navigation icons
	 * Left icon: Simple clickable area for previous navigation
	 */
	const iconLeft = useCallback(() => <div className="h-screen w-[5vw]" />, []);

	/**
	 * Right icon: Adjusts margin when side panel is open
	 */
	const iconRight = useCallback(() => <div className="h-screen w-[5vw]" />, []);

	const isFirstSlide = activeIndex === 0;
	const isLastSlide = activeIndex === (bookmarks?.length ?? 0) - 1;

	const on = useMemo(
		() => ({
			view: ({ index }: { index: number }) => onViewRef.current(index),
			zoom: ({ zoom }: { zoom: number }) => {
				setZoomLevel(zoom);
			},
		}),
		[onViewRef],
	);

	const plugins = useMemo(() => [Zoom, MetaButtonPlugin()], []);
	const zoom = useMemo(
		() => ({ ref: zoomRef, doubleClickDelay: 100, maxZoomPixelRatio: 100 }),
		[],
	);
	const animation = useMemo(() => ({ fade: 0, zoom: 200 }), []);
	const carousel = useMemo(() => ({ finite: true, preload: 1 }), []);
	const controller = useMemo(() => ({ closeOnBackdropClick: true }), []);

	// Memoize styles configuration
	const styles = useMemo(
		() => ({
			navigationNext: { top: "55.1px", transform: "none", padding: "0" },
			navigationPrev: { top: "55.1px", transform: "none", padding: "0" },
			toolbar: {
				position: "absolute" as const,
				top: "0",
				left: "0",
			},
			container: {
				backgroundColor: "var(--color-whites-900)",
				backdropFilter: "blur(32px)",
				transition: "all 0.2s ease-in-out",
				// Adjust width when side panel is visible
				width: lightboxShowSidepane
					? "calc(100% - min(max(320px, 20%), 400px))"
					: "100%",
				animation: "custom-fade-scale-in 0.25s ease-in-out",
			},
			slide: {
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			},
		}),
		[lightboxShowSidepane],
	);

	// Memoize toolbar configuration
	const toolbar = useMemo(
		() => ({
			buttons: [
				// Left: Close button
				<div className="flex items-center" key="left-section">
					<button
						className="group mt-1.5 ml-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-alpha-600 opacity-50 hover:opacity-100"
						onClick={handleClose}
						type="button"
					>
						<LightboxCloseIcon className="h-5 w-5" />
					</button>
				</div>,

				// Center: Bookmark URL (flex: 1 ensures centering)
				<div
					className="flex flex-1 justify-center pt-[9px] text-center"
					key="center-section"
				>
					<a
						className="flex max-w-[300px] items-center gap-2 overflow-hidden rounded-lg px-[13px] py-[7px] hover:bg-gray-alpha-100"
						href={bookmarks?.[activeIndex]?.url}
						key="center-section"
						rel="noreferrer"
						target="_blank"
					>
						<span className="truncate text-[14px] leading-[115%] font-normal tracking-normal text-gray-alpha-600">
							{bookmarks?.[activeIndex]?.url?.replace(/^https?:\/\//u, "")}
						</span>
						<figure className="h-4 w-4 shrink-0 text-gray-alpha-600">
							<LightboxExternalLink />
						</figure>
					</a>
				</div>,

				// Right: Side pane toggle button
				<div
					className="group flex h-7 w-7 items-center justify-center pt-[7px] pr-4"
					key="right-section"
				>
					<button
						onClick={() => {
							const newState = !lightboxShowSidepane;
							setLightboxShowSidepane(newState);
							localStorage.setItem("lightboxSidepaneOpen", String(newState));
						}}
						type="button"
					>
						<ShowSidePaneButton className="h-5 w-5 stroke-current text-gray-alpha-600 opacity-50 transition-colors duration-200 group-hover:opacity-100" />
					</button>
				</div>,
			],
		}),
		[
			handleClose,
			bookmarks,
			activeIndex,
			lightboxShowSidepane,
			setLightboxShowSidepane,
		],
	);

	// Memoize render configuration
	const render = useMemo(
		() => ({
			slide: renderSlide,
			iconNext: iconRight,
			iconPrev: iconLeft,
			buttonPrev:
				(slides?.length ?? 0) <= 1 ||
				isFirstSlide ||
				isMobile ||
				zoomLevel !== 1
					? () => null
					: undefined,
			buttonNext:
				(slides?.length ?? 0) <= 1 || isLastSlide || isMobile || zoomLevel !== 1
					? () => null
					: undefined,
			buttonZoom: () => null,
			// eslint-disable-next-line react/no-unstable-nested-components
			controls: () => <PullEffect enabled={zoomLevel === 1} />,
		}),
		[
			renderSlide,
			iconRight,
			iconLeft,
			slides?.length,
			isFirstSlide,
			isMobile,
			zoomLevel,
			isLastSlide,
		],
	);

	return (
		<Lightbox
			// Animation configuration for lightbox transitions
			animation={animation}
			carousel={carousel}
			close={handleClose}
			controller={controller}
			index={activeIndex}
			on={on}
			open={isOpen}
			plugins={plugins}
			render={render}
			slides={slides}
			styles={styles}
			toolbar={toolbar}
			zoom={zoom}
		/>
	);
};
