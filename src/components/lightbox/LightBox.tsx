import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { getDocument } from "pdfjs-dist";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
import { type PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import Lightbox, { type ZoomRef } from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

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
	PREVIEW_ALT_TEXT,
	PREVIEW_PATH,
	VIDEO_TYPE_PREFIX,
	YOUTU_BE,
	YOUTUBE_COM,
} from "../../utils/constants";
import { getCategorySlugFromRouter } from "../../utils/url";
import { VideoPlayer } from "../VideoPlayer";

import MetaButtonPlugin from "./LightBoxPlugin";
import { EmbedWithFallback } from "./objectFallBack";
import { type CustomSlide } from "./previewLightBox";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// PDF Viewer
const PDFViewer = ({ url }: { url: string }) => {
	const [pages, setPages] = useState<PDFPageProxy[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasReferences = useRef<Record<number, HTMLCanvasElement | null>>({});
	const textLayerReferences = useRef<Record<number, HTMLDivElement | null>>({});

	useEffect(() => {
		let isMounted = true;
		const loadPdf = async () => {
			try {
				const loadingTask = getDocument(url);
				const pdf = await loadingTask.promise;
				const numberPages = pdf.numPages;
				const pagePromises = Array.from({ length: numberPages }, (_, index) =>
					pdf.getPage(index + 1),
				);
				const loadedPages = await Promise.all(pagePromises);
				if (isMounted) setPages(loadedPages);
			} catch (error) {
				console.error("Error loading PDF:", error);
			}
		};

		void loadPdf();
		return () => {
			isMounted = false;
		};
	}, [url]);

	useEffect(() => {
		const renderPages = async () => {
			await Promise.all(
				pages.map(async (page, index) => {
					const canvas = canvasReferences.current[index];
					const textLayerDiv = textLayerReferences.current[index];
					if (!canvas || !textLayerDiv) return;

					const scale = 1.5;
					const viewport = page.getViewport({ scale });

					// Render PDF page to canvas
					canvas.height = viewport.height;
					canvas.width = viewport.width;
					const context = canvas.getContext("2d");
					if (!context) return;
					await page.render({ canvasContext: context, viewport }).promise;

					// Clear and render text layer
					textLayerDiv.innerHTML = "";

					const textContent = await page.getTextContent();
					pdfjsLib.renderTextLayer({
						textContent,
						container: textLayerDiv,
						viewport,
						textDivs: [],
						enhanceTextSelection: true,
					});
				}),
			);
		};

		if (pages.length > 0) void renderPages();

		const cleanup = () => {
			for (const page of pages) page?.cleanup();
		};

		return cleanup;
	}, [pages]);

	return (
		<div
			className="max-h-[80vh] w-full overflow-auto rounded shadow-inner"
			ref={containerRef}
		>
			{pages.length === 0 ? (
				<div className="flex h-full w-full items-center justify-center">
					<div className="animate-pulse text-gray-500">Loading PDF...</div>
				</div>
			) : (
				pages.map((_, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<div className="relative mx-auto my-4 w-fit shadow-md" key={index}>
						<canvas
							className="block"
							ref={(element) => {
								if (element) {
									canvasReferences.current = {
										...canvasReferences.current,
										[index]: element,
									};
								} else {
									const { [index]: __, ...rest } = canvasReferences.current;
									canvasReferences.current = rest;
								}
							}}
						/>
						<div
							className="absolute left-0 top-0 h-full w-full select-text overflow-hidden"
							ref={(element) => {
								if (element) {
									textLayerReferences.current = {
										...textLayerReferences.current,
										[index]: element,
									};
								} else {
									const { [index]: __, ...rest } = textLayerReferences.current;
									textLayerReferences.current = rest;
								}
							}}
						/>
					</div>
				))
			)}
		</div>
	);
};

// Bookmark type
export type Bookmark = Omit<
	SingleListData,
	"addedTags" | "inserted_at" | "trash" | "user_id"
> & {
	createdAt?: string;
	domain?: string;
	meta_data?: Partial<ImgMetadataType>;
};

// Custom LightBox
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
	const router = useRouter();
	const zoomRef = useRef<ZoomRef>(null);

	const setLightboxShowSidepane = useMiscellaneousStore(
		(state) => state?.setLightboxShowSidepane,
	);
	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state?.lightboxShowSidepane,
	);

	const handleClose = useCallback(() => {
		originalHandleClose();
		setLightboxShowSidepane(false);
	}, [originalHandleClose, setLightboxShowSidepane]);

	const slides = useMemo(() => {
		if (!bookmarks) return [];
		return bookmarks.map((bookmark) => {
			const isImage =
				bookmark?.meta_data?.mediaType?.startsWith(IMAGE_TYPE_PREFIX) ||
				bookmark?.meta_data?.isOgImagePreferred ||
				bookmark?.type?.startsWith(IMAGE_TYPE_PREFIX);

			const isVideo = bookmark?.type?.startsWith(VIDEO_TYPE_PREFIX);

			return {
				src: bookmark?.url,
				type: isVideo
					? VIDEO_TYPE_PREFIX
					: isImage
					? IMAGE_TYPE_PREFIX
					: undefined,
				...(bookmark?.meta_data?.mediaType !== PDF_MIME_TYPE &&
					!bookmark?.type?.includes(PDF_TYPE) &&
					!bookmark?.url?.includes(YOUTUBE_COM) &&
					!bookmark?.url?.includes(YOUTU_BE) && {
						width: bookmark?.meta_data?.width ?? 1_200,
						height: bookmark?.meta_data?.height ?? 800,
					}),
				...(isVideo && {
					sources: [
						{ src: bookmark?.url, type: bookmark?.type ?? VIDEO_TYPE_PREFIX },
					],
				}),
			};
		}) as CustomSlide[];
	}, [bookmarks]);

	const renderSlide = useCallback(
		(slideProps: { offset: number; slide: CustomSlide }) => {
			const { offset, slide } = slideProps;

			// Find the corresponding bookmark for this slide
			const slideIndex = slides?.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

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
					<div className="relative max-w-[80vw]">
						<Image
							alt={PREVIEW_ALT_TEXT}
							className="max-h-[80vh] w-auto"
							draggable={false}
							height={bookmark?.meta_data?.height ?? 800}
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

			const renderPDFSlide = () =>
				bookmark?.url ? (
					<div className="relative flex h-full w-full max-w-[1200px] flex-col items-center justify-center">
						<div className="flex h-full w-full items-center justify-center">
							<PDFViewer url={bookmark.url} />
						</div>
					</div>
				) : null;

			const renderYouTubeSlide = () => (
				<div className="flex h-full w-full max-w-[80vw] items-center justify-center">
					<VideoPlayer isActive={isActive} src={bookmark?.url} />
				</div>
			);

			const renderWebEmbedSlide = () => (
				<EmbedWithFallback
					currentZoomRef={zoomRef}
					placeholder={bookmark?.ogImage ?? ""}
					placeholderHeight={bookmark?.meta_data?.height ?? 800}
					placeholderWidth={bookmark?.meta_data?.width ?? 1_200}
					src={bookmark?.url}
				/>
			);

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
			} else if (
				bookmark?.url?.includes(YOUTUBE_COM) ||
				bookmark?.url?.includes(YOUTU_BE)
			) {
				content = renderYouTubeSlide();
			} else if (bookmark?.url) {
				content = renderWebEmbedSlide();
			}

			return (
				<div className="flex h-full w-full items-center justify-center">
					{content}
				</div>
			);
		},
		[bookmarks, slides],
	);

	const iconLeft = () => <div className="h-[50vh] w-[150px] cursor-pointer" />;
	const iconRight = () => (
		<div
			className={`h-[50vh] w-[150px] ${lightboxShowSidepane ? "mr-80" : ""}`}
		/>
	);

	const isFirstSlide = activeIndex === 0;
	const isLastSlide = activeIndex === bookmarks.length - 1;

	return (
		<Lightbox
			animation={{ fade: 0, zoom: 200 }}
			carousel={{ finite: true }}
			close={handleClose}
			controller={{
				disableSwipeNavigation: true,
			}}
			index={activeIndex}
			on={{
				view: ({ index }) => {
					if (!isPage || !bookmarks?.[index]) return;
					setActiveIndex(index);
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
						{ shallow: true },
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
					<button
						className="flex items-center gap-2 text-gray-500 transition hover:text-gray-700"
						key={LIGHTBOX_SHOW_PANE_BUTTON}
						onClick={() => setLightboxShowSidepane(!lightboxShowSidepane)}
						type="button"
					>
						<MetaDataIcon />
					</button>,
					LIGHTBOX_CLOSE_BUTTON,
				],
			}}
			zoom={{ ref: zoomRef, doubleClickDelay: 100, maxZoomPixelRatio: 5 }}
		/>
	);
};
