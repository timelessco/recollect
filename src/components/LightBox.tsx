import { useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { format } from "date-fns";
import Lightbox, { type Slide as BaseSlide } from "yet-another-react-lightbox";
import { Video } from "yet-another-react-lightbox/plugins";

import { EmbedWithFallback } from "../pageComponents/dashboard/cardSection/objectFallBack";
import { type CustomSlide } from "../pageComponents/dashboard/cardSection/previewLightBox";
import { CATEGORY_ID_PATHNAME } from "../utils/constants";

type ImageSlide = BaseSlide & {
	data?: {
		type?: string;
	};
	src: string;
};

// Update the LightBox.tsx component
export type Bookmark = {
	createdAt?: string;
	description?: string;
	domain?: string;
	id: number;
	ogImage?: string | null;
	title?: string;
	type?: string;
	url: string;
};

export const CustomLightBox = ({
	bookmarks,
	activeIndex,
	setActiveIndex,
	isOpen,
	handleClose,
	isPage,
	showArrow,
}: {
	activeIndex: number;
	bookmarks?: Bookmark[];
	handleClose: () => void;
	isOpen: boolean;
	isPage?: boolean;
	setActiveIndex: (index: number) => void;
	showArrow?: boolean;
}) => {
	const router = useRouter();
	const slides = useMemo(() => {
		if (!bookmarks) return [];
		return bookmarks.map((bookmark) => ({
			src: bookmark.url,
			...(bookmark.type === "video/mp4"
				? {
						type: "video" as const,
						sources: [
							{
								src: bookmark.url,
								type: "video/mp4",
							},
						],
				  }
				: {}),
		})) as CustomSlide[];
	}, [bookmarks]);

	const renderSlide = useCallback(
		(slideProps: { slide: CustomSlide }) => {
			const { slide } = slideProps;
			// Type guard to check if the slide is a video
			if ("type" in slide && slide.type === "video") return null;

			// Type assertion since we know it's not a video slide
			const imageSlide = slide as ImageSlide;

			const slideIndex = slides.findIndex(
				(slideItem) =>
					slideItem === slide ||
					(slideItem as ImageSlide).src === imageSlide.src,
			);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			return (
				<div className="flex h-full w-full items-center justify-center">
					{bookmark?.type?.startsWith("image") ? (
						<div className="flex items-center justify-center">
							<div className="relative max-w-[1200px]">
								<Image
									alt="Preview"
									className="h-auto max-h-[80vh] w-auto"
									height={0}
									src={bookmark?.url}
									unoptimized
									width={0}
								/>
							</div>
						</div>
					) : bookmark?.type?.startsWith("application") ? (
						<div className="relative flex h-full w-full max-w-[1200px] items-center justify-center">
							<div className=" relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl shadow-lg">
								<embed
									className="block h-full w-full border-none"
									key={bookmark?.url}
									src={`${bookmark?.url}#toolbar=0&navpanes=0&scrollbar=0&zoom=100&page=1&view=FitH`}
									type="application/pdf"
								/>
							</div>
						</div>
					) : (
						<EmbedWithFallback
							placeholder={bookmark?.ogImage ?? ""}
							src={bookmark?.url}
						/>
					)}
				</div>
			);
		},
		[bookmarks, slides],
	);

	const currentBookmark = bookmarks?.[activeIndex];

	return (
		<div className="relative">
			<Lightbox
				close={handleClose}
				index={activeIndex}
				on={{
					view: ({ index }) => {
						if (!isPage || !bookmarks?.[index]) return;
						setActiveIndex(index);
						void router.push(
							{
								pathname: `/${CATEGORY_ID_PATHNAME}`,
								query: {
									category_id: router.asPath.split("/")[1],
									id: bookmarks?.[index].id,
								},
							},
							`/${router.asPath.split("/")[1]}/preview/${bookmarks?.[index]
								.id}`,
							{
								shallow: true,
							},
						);
					},
				}}
				open={isOpen}
				plugins={[Video]}
				render={{
					slide: renderSlide,
					buttonPrev: showArrow ? undefined : () => null,
					buttonNext: showArrow ? undefined : () => null,
				}}
				slides={slides}
				styles={{
					container: {
						backgroundColor: "rgba(255, 255, 255, 0.9)",
						backdropFilter: "blur(32px)",
						paddingRight: "320px",
						transition: "padding 0.3s ease",
						// Set a lower z-index for the lightbox container
						zIndex: 50_000,
					},
				}}
				video={{
					controls: true,
					playsInline: true,
					autoPlay: true,
					loop: false,
					muted: true,
					disablePictureInPicture: true,
					disableRemotePlayback: true,
					controlsList: "nodownload",
					crossOrigin: "anonymous",
					preload: "auto",
				}}
			/>
			{/* Sidepane - Fixed z-index and positioning */}
			{isOpen && (
				<div
					className="fixed right-0 top-0 z-[99999] h-full w-80 translate-x-0 bg-white shadow-lg"
					style={{ zIndex: 99_999 }}
				>
					<div className="border-b border-gray-200 p-4">
						<h3 className="font-medium">Details</h3>
					</div>
					<div className="h-[calc(100%-56px)] space-y-4 overflow-y-auto p-4">
						{currentBookmark ? (
							<>
								<div>
									<h4 className="mb-1 text-sm font-medium text-gray-500">
										Title
									</h4>
									<p className="break-words text-gray-900">
										{currentBookmark.title ?? "No title available"}
									</p>
								</div>
								{currentBookmark.description && (
									<div>
										<h4 className="mb-1 text-sm font-medium text-gray-500">
											Description
										</h4>
										<p className="break-words text-sm text-gray-700">
											{currentBookmark.description}
										</p>
									</div>
								)}
								<div>
									<h4 className="mb-1 text-sm font-medium text-gray-500">
										Type
									</h4>
									<p className="text-sm capitalize text-gray-700">
										{currentBookmark.type?.split("/")[0] ?? "Unknown"}
									</p>
								</div>
								<div>
									<h4 className="mb-1 text-sm font-medium text-gray-500">
										Source
									</h4>
									<a
										className="break-all text-sm text-blue-600 hover:underline"
										href={currentBookmark.url}
										rel="noopener noreferrer"
										target="_blank"
									>
										{currentBookmark.domain ??
											new URL(currentBookmark.url).hostname}
									</a>
								</div>
								{currentBookmark.createdAt && (
									<div>
										<h4 className="mb-1 text-sm font-medium text-gray-500">
											Saved on
										</h4>
										<p className="text-sm text-gray-700">
											{format(
												new Date(currentBookmark.createdAt),
												"MMM d, yyyy",
											)}
										</p>
									</div>
								)}
								<div className="border-t border-gray-200 pt-4">
									<a
										className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
										href={currentBookmark.url}
										rel="noopener noreferrer"
										target="_blank"
									>
										Open Original
									</a>
								</div>
							</>
						) : (
							<div className="py-8 text-center text-gray-500">
								No metadata available
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
