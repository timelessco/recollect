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
	meta_data?: {
		height?: number | null;
		width?: number | null;
	};
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
		createdAt?: string;
		description: string | null;
		domain: string;
		id: number;
		meta_data?: {
			height: number | null;
			width: number | null;
		};
		ogImage?: string | null;
		title: string;
		type?: string;
		url: string;
	}>;
	handleClose: () => void;
	isOpen: boolean;
	isPage?: boolean;
	setActiveIndex: (index: number) => void;
}) => {
	const router = useRouter();
	const [showControls, setShowControls] = useState(false);
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
	const [showSidepane, setShowSidepane] = useState(false);

	const renderSlide = useCallback(
		(slideProps: { slide: CustomSlide }) => {
			const { slide } = slideProps;

			// Find the slide index by matching the slide object reference
			const slideIndex = slides.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			return (
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
							placeholder={bookmark?.ogImage ?? ""}
							placeholderHeight={bookmark.meta_data?.height ?? 0}
							placeholderWidth={bookmark.meta_data?.width ?? 0}
							src={bookmark?.url}
						/>
					)}
				</div>
			);
		},
		[bookmarks, showControls, slides],
	);

	const renderSidePane = useCallback(() => {
		const bookmark = bookmarks?.[activeIndex];
		if (!showSidepane || !bookmark) return null;

		return (
			<div className="absolute right-0 top-0 flex h-full w-80 flex-col border-l border-gray-200 bg-white/90 shadow-xl backdrop-blur-xl">
				<div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
					<span className="font-medium text-gray-700">Meta Data</span>
					<button
						className="text-gray-500 transition hover:text-gray-700"
						onClick={() => setShowSidepane(false)}
						type="button"
					>
						Hide Meta Data
					</button>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm text-gray-800">
					{bookmark.title && (
						<div>
							<p className="text-xs text-gray-500">Title</p>
							<p className="font-medium">{bookmark.title}</p>
						</div>
					)}
					{bookmark.domain && (
						<div>
							<p className="text-xs text-gray-500">Domain</p>
							<p>{bookmark.domain}</p>
						</div>
					)}
					{bookmark.description && (
						<div>
							<p className="text-xs text-gray-500">Description</p>
							<p className="text-gray-700">{bookmark.description}</p>
						</div>
					)}
					{bookmark.createdAt && (
						<div>
							<p className="text-xs text-gray-500">Created At</p>
							<p>{format(new Date(bookmark.createdAt), "MMM d, yyyy")}</p>
						</div>
					)}
					{bookmark.url && (
						<div>
							<p className="text-xs text-gray-500">URL</p>
							<a
								className="break-all text-blue-600 underline"
								href={bookmark.url}
								rel="noopener noreferrer"
								target="_blank"
							>
								{bookmark.url}
							</a>
						</div>
					)}
				</div>
			</div>
		);
	}, [showSidepane, bookmarks, activeIndex]);

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
			render={{
				slide: renderSlide,
				controls: renderSidePane,
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
				},
			}}
			toolbar={{
				buttons: [
					<button
						className=" text-gray-500 transition hover:text-gray-700"
						key="show-pane"
						onClick={() => setShowSidepane(true)}
						type="button"
					>
						Show Meta Data
					</button>,
					"close",
				],
			}}
		/>
	);
};
