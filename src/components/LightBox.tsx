import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { format } from "date-fns";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { EmbedWithFallback } from "../pageComponents/dashboard/cardSection/objectFallBack";
import { type CustomSlide } from "../pageComponents/dashboard/cardSection/previewLightBox";
import { type ImgMetadataType, type SingleListData } from "../types/apiTypes";
import { CATEGORY_ID_PATHNAME } from "../utils/constants";

import MyPlugin from "./LightBoxPlugin";
import { VideoPlayer } from "./VideoPlayer";

export type Bookmark = Omit<
	SingleListData,
	"addedTags" | "inserted_at" | "trash" | "user_id"
> & {
	createdAt?: string;
	domain?: string;
	meta_data?: Partial<ImgMetadataType>;
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
	bookmarks?: Bookmark[];
	handleClose: () => void;
	isOpen: boolean;
	isPage?: boolean;
	setActiveIndex: (index: number) => void;
}) => {
	const router = useRouter();
	const domain = new URL(bookmarks[activeIndex].url).hostname;
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
		(slideProps: { offset: number; slide: CustomSlide }) => {
			const { offset, slide } = slideProps;

			const slideIndex = slides.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			const isActive = offset === 0;

			return (
				<div className="flex h-full w-full items-center justify-center">
					{bookmark?.meta_data?.mediaType?.startsWith("image/") ||
					bookmark?.meta_data?.isOgImagePreferred ||
					bookmark?.type?.startsWith("image") ? (
						<div className="flex items-center justify-center">
							<div className="relative max-w-[80vw]">
								<Image
									alt="Preview"
									className="h-auto max-h-[80vh] w-auto"
									height={bookmark.meta_data?.height ?? 0}
									src={
										bookmark?.meta_data?.mediaType?.startsWith("image/") ||
										bookmark?.meta_data?.isOgImagePreferred
											? bookmark?.ogImage ?? ""
											: bookmark?.url
									}
									width={bookmark.meta_data?.width ?? 0}
								/>
							</div>
						</div>
					) : bookmark?.meta_data?.mediaType?.startsWith("video/") ||
					  bookmark?.type?.startsWith("video") ? (
						<div className="flex h-full w-full items-center justify-center">
							<div className="w-full max-w-4xl">
								<VideoPlayer isActive={isActive} src={bookmark?.url} />
							</div>
						</div>
					) : bookmark?.meta_data?.mediaType === "application/pdf" ||
					  bookmark?.type?.includes("pdf") ? (
						<div className="relative flex h-full w-full max-w-[80vw] items-center justify-center">
							<div className="h-full w-full">
								<div className="flex h-full w-full items-center justify-center bg-gray-50">
									<embed
										className="block h-full w-full border-none"
										key={bookmark?.url}
										src={`${bookmark?.url}#toolbar=0&navpanes=0&scrollbar=0&zoom=100&page=1&view=FitH`}
										type="application/pdf"
									/>
								</div>
							</div>
						</div>
					) : !bookmark?.url ? null : (
						<>
							{bookmark.url.includes("youtube.com") ||
							bookmark.url.includes("youtu.be") ? (
								<div className="flex h-full w-full max-w-[80vw] items-center justify-center">
									<VideoPlayer isActive={isActive} src={bookmark.url} />
								</div>
							) : (
								<EmbedWithFallback
									placeholder={bookmark.ogImage ?? ""}
									placeholderHeight={bookmark.meta_data?.height ?? 0}
									placeholderWidth={bookmark.meta_data?.width ?? 0}
									src={bookmark.url}
								/>
							)}
						</>
					)}
				</div>
			);
		},
		[bookmarks, slides],
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
					{domain && (
						<div>
							<p
								className="text-xs text-gray-500"
								tabIndex={isHidden ? -1 : undefined}
							>
								Domain
							</p>
							<p tabIndex={isHidden ? -1 : undefined}>{domain}</p>
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
	}, [showSidepane, bookmarks, activeIndex, domain]);

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
				fade: 150,
				zoom: 200,
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
			plugins={[Zoom, MyPlugin()]}
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
