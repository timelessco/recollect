import { useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { motion } from "motion/react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { MetaDataIcon } from "../icons/metaData";
import { EmbedWithFallback } from "../pageComponents/dashboard/cardSection/objectFallBack";
import { type CustomSlide } from "../pageComponents/dashboard/cardSection/previewLightBox";
import { useMiscellaneousStore } from "../store/componentStore";
import { type ImgMetadataType, type SingleListData } from "../types/apiTypes";
import { CATEGORY_ID_PATHNAME } from "../utils/constants";

import MetaButtonPlugin from "./LightBoxPlugin";
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
	const setLightboxShowSidepane = useMiscellaneousStore(
		(state) => state.setLightboxShowSidepane,
	);
	const lightboxShowSidepane = useMiscellaneousStore(
		(state) => state.lightboxShowSidepane,
	);

	const handleClose = useCallback(() => {
		originalHandleClose();
		setLightboxShowSidepane(false);
	}, [originalHandleClose, setLightboxShowSidepane]);
	const slides = useMemo(() => {
		if (!bookmarks) return [];
		return bookmarks.map((bookmark) => {
			const isImage = bookmark.type?.startsWith("image");
			const isVideo = bookmark.type?.startsWith("video");

			// For direct images or when an image is rendered in objectFallBack, always provide dimensions for zoom
			const shouldHaveDimensions =
				isImage ||
				bookmark?.meta_data?.mediaType?.startsWith("image/") ||
				bookmark?.meta_data?.isOgImagePreferred ||
				(bookmark?.meta_data?.screenshot &&
					bookmark?.meta_data?.width &&
					bookmark?.meta_data?.height);

			return {
				src: bookmark.url,
				type: isVideo ? "video" : isImage ? "image" : undefined,
				// Only provide dimensions for direct images to enable zoom
				...(shouldHaveDimensions && {
					width: bookmark.meta_data?.width ?? 800,
					height: bookmark.meta_data?.height ?? 600,
				}),
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

	const renderSlide = useCallback(
		(slideProps: { offset: number; slide: CustomSlide }) => {
			const { offset, slide } = slideProps;

			const slideIndex = slides.indexOf(slide);
			const bookmark = bookmarks?.[slideIndex];
			if (!bookmark) return null;

			const isActive = offset === 0;

			return (
				<motion.div
					className="flex h-full w-full items-center justify-center"
					layout
				>
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
				</motion.div>
			);
		},
		[bookmarks, slides],
	);

	const iconLeft = () => <div className=" h-[50vh] w-[150px] cursor-pointer" />;

	const iconRight = () => (
		<div
			className={`h-[50vh] w-[150px] cursor-pointer  ${
				lightboxShowSidepane ? "mr-80" : ""
			}`}
		/>
	);

	return (
		<Lightbox
			animation={{
				fade: 0,
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
			plugins={[Zoom, MetaButtonPlugin()]}
			render={{
				slide: renderSlide,
				iconNext: iconRight,
				iconPrev: iconLeft,
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
						key="show-pane"
						onClick={() => setLightboxShowSidepane(!lightboxShowSidepane)}
						title={lightboxShowSidepane ? "Hide Meta Data" : "Show Meta Data"}
						type="button"
					>
						<MetaDataIcon />
					</button>,
					"close",
				],
			}}
		/>
	);
};
