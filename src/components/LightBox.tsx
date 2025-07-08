import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { format } from "date-fns";
import Lightbox from "yet-another-react-lightbox";

import { EmbedWithFallback } from "../pageComponents/dashboard/cardSection/objectFallBack";
import { type CustomSlide } from "../pageComponents/dashboard/cardSection/previewLightBox";
import { CATEGORY_ID_PATHNAME } from "../utils/constants";

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
	bookmarks = [],
	activeIndex,
	setActiveIndex,
	isOpen,
	handleClose,
	isPage,
}: {
	activeIndex: number;
	bookmarks?: Array<{
		id: number;
		meta_data?: {
			height: number | null;
			width: number | null;
		};
		ogImage?: string | null;
		type?: string;
		url: string;
	}>;
	handleClose: () => void;
	isOpen: boolean;
	isPage?: boolean;
	setActiveIndex: (index: number) => void;
}) => {
	const router = useRouter();
	const [isSidepaneOpen, setIsSidepaneOpen] = useState(false);
	const [showControls, setShowControls] = useState(false);

	const toggleSidepane = useCallback(() => {
		setIsSidepaneOpen((previous) => !previous);
	}, []);
	const slides = useMemo(() => {
		if (!bookmarks) return [];
		return bookmarks.map((bookmark) => ({
			src: bookmark.url,
			type: bookmark.type?.startsWith("video") ? "video" : "image",
			...(bookmark.type?.startsWith("video") && {
				sources: [
					{
						src: bookmark.url,
						type: bookmark.type || "video/mp4",
					},
				],
			}),
		})) as CustomSlide[];
	}, [bookmarks]);

	const renderSlide = useCallback(
		(slideProps: { slide: CustomSlide }) => {
			const { slide } = slideProps;

			// Find the slide index by matching the slide object reference
			const slideIndex = slides.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			return (
				<div className="flex h-full w-full">
					<div className="flex h-full w-full items-center justify-center ">
						{bookmark?.type?.startsWith("image") ? (
							<div className="flex items-center justify-center">
								<div className="relative max-w-[1200px]">
									<Image
										alt="Preview"
										className="h-auto max-h-[80vh] w-auto"
										height={bookmark.meta_data?.height ?? 0}
										src={bookmark?.url}
										width={0}
									/>
								</div>
							</div>
						) : bookmark?.type?.startsWith("video") ? (
							<div className="flex h-full w-full items-center justify-center ">
								<div
									className="relative w-full max-w-4xl"
									onMouseEnter={() => setShowControls(true)}
									onMouseLeave={() => setShowControls(false)}
								>
									<video
										autoPlay
										className="h-full max-h-[70vh] w-full object-contain"
										controls={showControls}
										src={bookmark?.url}
									>
										<track kind="captions" src="" />
									</video>
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
								height={bookmark.meta_data?.height ?? 0}
								placeholder={bookmark?.ogImage ?? ""}
								src={bookmark?.url}
								width={bookmark.meta_data?.width ?? 0}
							/>
						)}
					</div>
					<button
						className="absolute right-10 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
						onClick={toggleSidepane}
						type="button"
					>
						<svg
							className="h-5 w-5 text-gray-600"
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path d={!isSidepaneOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
						</svg>
					</button>
					{/* Sidepane */}
					<div
						className={`h-full bg-white shadow-lg transition-all duration-300 ease-in-out ${
							isSidepaneOpen ? "w-80 border-l border-gray-200" : "w-0"
						}`}
					>
						<div className="h-full overflow-y-auto p-4">
							<div className="min-w-[288px] space-y-4">
								<div>
									<h4 className="mb-1 text-sm font-medium text-gray-500">
										Title
									</h4>
									<p className="break-words text-gray-900">
										{bookmark?.title ?? "No title available"}
									</p>
								</div>
								{bookmark?.description && (
									<div>
										<h4 className="mb-1 text-sm font-medium text-gray-500">
											Description
										</h4>
										<p className="break-words text-sm text-gray-700">
											{bookmark?.description}
										</p>
									</div>
								)}
								<div>
									<h4 className="mb-1 text-sm font-medium text-gray-500">
										Type
									</h4>
									<p className="text-sm capitalize text-gray-700">
										{bookmark?.type?.split("/")[0] ?? "Unknown"}
									</p>
								</div>
								<div>
									<h4 className="mb-1 text-sm font-medium text-gray-500">
										Source
									</h4>
									<a
										className="break-all text-sm text-blue-600 hover:underline"
										href={bookmark?.url}
										rel="noopener noreferrer"
										target="_blank"
									>
										{bookmark?.domain ?? new URL(bookmark?.url).hostname}
									</a>
								</div>
								{bookmark?.createdAt && (
									<div>
										<h4 className="mb-1 text-sm font-medium text-gray-500">
											Saved on
										</h4>
										<p className="text-sm text-gray-700">
											{format(new Date(bookmark?.createdAt), "MMM d, yyyy")}
										</p>
									</div>
								)}
								<div className="border-t border-gray-200 pt-4">
									<a
										className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
										href={bookmark?.url}
										rel="noopener noreferrer"
										target="_blank"
									>
										Open Original
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			);
		},
		[bookmarks, isSidepaneOpen, slides, toggleSidepane, showControls],
	);

	return (
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
								id: bookmarks[index].id,
							},
						},
						`/${router.asPath.split("/")[1]}/preview/${bookmarks[index].id}`,
						{
							shallow: true,
						},
					);
				},
			}}
			open={isOpen}
			// Remove Video plugin to handle videos manually in renderSlide
			render={{
				buttonNext: () => null,
				buttonPrev: () => null,
				slide: renderSlide,
			}}
			slides={slides}
			styles={{
				container: {
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					backdropFilter: "blur(32px)",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					transition: "padding 0.3s ease",
					zIndex: 50_000,
				},
			}}
		/>
	);
};
