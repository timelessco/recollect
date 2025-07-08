import { useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
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
									height={bookmark.meta_data?.height ?? 0}
									src={bookmark?.url}
									width={bookmark.meta_data?.width ?? 0}
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
							height={bookmark.meta_data?.height ?? 0}
							placeholder={bookmark?.ogImage ?? ""}
							src={bookmark?.url}
							width={bookmark.meta_data?.width ?? 0}
						/>
					)}
				</div>
			);
		},
		[bookmarks, slides],
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
							// https://github.com/vercel/next.js/discussions/11625
							// https://github.com/adamwathan/headbangstagram/pull/1/files
							pathname: `/${CATEGORY_ID_PATHNAME}`,
							query: {
								category_id: router.asPath.split("/")[1],
								id: bookmarks?.[index].id,
							},
						},
						`/${router.asPath.split("/")[1]}/preview/${bookmarks?.[index].id}`,
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
	);
};
