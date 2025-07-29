import { useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { motion } from "motion/react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { MetaDataIcon } from "../../icons/metaData";
import { EmbedWithFallback } from "../../pageComponents/dashboard/cardSection/objectFallBack";
import { type CustomSlide } from "../../pageComponents/dashboard/cardSection/previewLightBox";
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
	VIDEO_TYPE_PREFIX,
	YOUTU_BE,
	YOUTUBE_COM,
} from "../../utils/constants";
import { VideoPlayer } from "../VideoPlayer";

import MetaButtonPlugin from "./LightBoxPlugin";

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
			const isImage = bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX);
			const isVideo = bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX);

			// Determine if slide should have dimensions for zoom functionality
			// Images need dimensions to enable proper zoom behavior
			const shouldHaveDimensions =
				isImage ||
				bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
				bookmark?.meta_data?.isOgImagePreferred ||
				(bookmark?.meta_data?.screenshot &&
					bookmark?.meta_data?.width &&
					bookmark?.meta_data?.height);

			return {
				src: bookmark?.url,
				// Set slide type for lightbox to handle appropriately
				type: isVideo
					? VIDEO_TYPE_PREFIX
					: isImage
					? IMAGE_TYPE_PREFIX
					: undefined,
				// Conditionally add dimensions for zoom functionality
				...(shouldHaveDimensions && {
					width: bookmark?.meta_data?.width ?? 800,
					height: bookmark?.meta_data?.height ?? 600,
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
			const slideIndex = slides.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			// Determine if this slide is currently active (visible)
			const isActive = offset === 0;

			return (
				<motion.div
					className="flex h-full w-full items-center justify-center"
					layout
				>
					{/* IMAGE RENDERING */}
					{bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
					bookmark?.meta_data?.isOgImagePreferred ||
					bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX) ? (
						<div className="flex items-center justify-center">
							<div className="relative max-w-[80vw]">
								<Image
									alt={PREVIEW_ALT_TEXT}
									className="max-h-[80vh] w-auto"
									height={bookmark?.meta_data?.height ?? 0}
									src={
										// Use OG image if preferred, otherwise use direct URL
										bookmark?.meta_data?.mediaType?.startsWith(
											IMAGE_TYPE_PREFIX,
										) || bookmark?.meta_data?.isOgImagePreferred
											? bookmark?.ogImage ?? ""
											: bookmark?.url
									}
									width={bookmark?.meta_data?.width ?? 0}
								/>
							</div>
						</div>
					) : bookmark?.meta_data?.mediaType?.startsWith(VIDEO_TYPE_PREFIX) ||
					  bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX) ? (
						<div className="flex h-full w-full items-center justify-center">
							<div className="w-full max-w-4xl">
								<VideoPlayer isActive={isActive} src={bookmark?.url} />
							</div>
						</div>
					) : bookmark?.meta_data?.mediaType === PDF_MIME_TYPE ||
					  bookmark?.type?.includes(PDF_TYPE) ? (
						<div className="relative flex h-full w-full max-w-[80vw] items-center justify-center">
							<div className="h-full w-full">
								<div className="flex h-full w-full items-center justify-center bg-gray-50">
									{/* Embedded PDF viewer with custom parameters */}
									<embed
										className="block h-full w-full border-none"
										key={bookmark?.url}
										src={`${bookmark?.url}${PDF_VIEWER_PARAMS}`}
										type={PDF_MIME_TYPE}
									/>
								</div>
							</div>
						</div>
					) : !bookmark?.url ? null : (
						<>
							{/* Special handling for YouTube URLs */}
							{bookmark.url.includes(YOUTUBE_COM) ||
							bookmark.url.includes(YOUTU_BE) ? (
								<div className="flex h-full w-full max-w-[80vw] items-center justify-center">
									<VideoPlayer isActive={isActive} src={bookmark?.url} />
								</div>
							) : (
								/* Generic web content with fallback image */
								<EmbedWithFallback
									placeholder={bookmark?.ogImage ?? ""}
									placeholderHeight={bookmark?.meta_data?.height ?? 0}
									placeholderWidth={bookmark?.meta_data?.width ?? 0}
									src={bookmark?.url}
								/>
							)}
						</>
					)}
				</motion.div>
			);
		},
		[bookmarks, slides],
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
			className={`h-[50vh] w-[150px] cursor-pointer  ${
				lightboxShowSidepane ? "mr-80" : ""
			}`}
		/>
	);

	return (
		<Lightbox
			// Animation configuration for lightbox transitions
			animation={{
				fade: 0,
				zoom: 200,
			}}
			close={handleClose}
			index={activeIndex}
			// Event handlers
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
								category_id: router?.asPath?.split("/")?.[1],
								id: bookmarks?.[index]?.id,
							},
						},
						`/${router?.asPath?.split("/")?.[1]}/preview/${bookmarks?.[index]
							?.id}`,
						{
							// Don't trigger a full page reload
							shallow: true,
						},
					);
				},
			}}
			open={isOpen}
			// Plugins for additional functionality
			plugins={[Zoom, MetaButtonPlugin()]}
			// Custom renderers
			render={{
				slide: renderSlide,
				iconNext: iconRight,
				iconPrev: iconLeft,
			}}
			slides={slides}
			// Custom styling
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
			// Custom toolbar with metadata toggle and close buttons
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
		/>
	);
};
