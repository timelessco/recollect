import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { format } from "date-fns";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

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
		return bookmarks.map((bookmark) => {
			const isImage = bookmark.type?.startsWith("image");
			const isVideo = bookmark.type?.startsWith("video");

			return {
				src: bookmark.url,
				type: isVideo ? "video" : isImage ? "image" : undefined,
				width: bookmark.meta_data?.width ?? 800,
				height: bookmark.meta_data?.height ?? 600,
				...(isVideo && {
					sources: [
						{
							src: bookmark.url,
							type: bookmark.type ?? "video/mp4",
						},
					],
				}),
			};
		}) as CustomSlide[];
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
				<div className="flex h-full w-full items-center justify-center">
					{bookmark?.type?.startsWith("image") ? (
						<div className="flex items-center justify-center">
							<div className="relative max-w-[80vh]">
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
						<div className="relative flex h-full w-full max-w-[80vh] items-center justify-center">
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
		if (!bookmark) return null;

		const isHidden = !showSidepane;

		return (
			<div
				aria-hidden={isHidden}
				className={`absolute right-0 top-0 flex h-full w-80 flex-col border-l border-gray-200 bg-white/90 shadow-xl backdrop-blur-xl transition-transform duration-300 ease-in-out ${
					showSidepane ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<div className="flex items-center justify-between border-b border-gray-300 px-4 py-3">
					<span
						className="font-medium text-gray-700"
						tabIndex={isHidden ? -1 : undefined}
					>
						Meta Data
					</span>
					<button
						className="text-gray-500 transition hover:text-gray-700"
						onClick={() => setShowSidepane(false)}
						tabIndex={isHidden ? -1 : 0}
						type="button"
					>
						Hide Meta Data
					</button>
				</div>
				<div
					aria-hidden={isHidden}
					className="flex-1 space-y-4 overflow-y-auto p-4 text-sm text-gray-800"
				>
					{bookmark.title && (
						<div>
							<p
								className="text-xs text-gray-500"
								tabIndex={isHidden ? -1 : undefined}
							>
								Title
							</p>
							<p className="font-medium" tabIndex={isHidden ? -1 : undefined}>
								{bookmark.title}
							</p>
						</div>
					)}
					{bookmark.domain && (
						<div>
							<p
								className="text-xs text-gray-500"
								tabIndex={isHidden ? -1 : undefined}
							>
								Domain
							</p>
							<p tabIndex={isHidden ? -1 : undefined}>{bookmark.domain}</p>
						</div>
					)}
					{bookmark.description && (
						<div>
							<p
								className="text-xs text-gray-500"
								tabIndex={isHidden ? -1 : undefined}
							>
								Description
							</p>
							<p className="text-gray-700" tabIndex={isHidden ? -1 : undefined}>
								{bookmark.description}
							</p>
						</div>
					)}
					{bookmark.createdAt && (
						<div>
							<p
								className="text-xs text-gray-500"
								tabIndex={isHidden ? -1 : undefined}
							>
								Created At
							</p>
							<p tabIndex={isHidden ? -1 : undefined}>
								{format(new Date(bookmark.createdAt), "MMM d, yyyy")}
							</p>
						</div>
					)}
					{bookmark.url && (
						<div>
							<p
								className="text-xs text-gray-500"
								tabIndex={isHidden ? -1 : undefined}
							>
								URL
							</p>
							<a
								className="break-all text-blue-600 underline"
								href={bookmark.url}
								rel="noopener noreferrer"
								tabIndex={isHidden ? -1 : 0}
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

	const iconLeft = () => <div className=" h-[50vh] w-[150px] cursor-pointer" />;

	const iconRight = () => (
		<div
			className={`h-[50vh] w-[150px] cursor-pointer  ${
				showSidepane ? "mr-80" : ""
			}`}
		/>
	);

	return (
		<Lightbox
			animation={{
				zoom: 300,
			}}
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
			plugins={[Zoom]}
			render={{
				slide: renderSlide,
				controls: renderSidePane,
				iconNext: iconRight,
				iconPrev: iconLeft,
			}}
			slides={slides}
			styles={{
				container: {
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					backdropFilter: "blur(32px)",
					transition: "all 0.3s ease",
					paddingRight: showSidepane ? "20rem" : 0,
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
