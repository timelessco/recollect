import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type DraggableItemProps } from "react-aria";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";

import { useMiscellaneousStore } from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";

import { EmbedWithFallback } from "./objectFallBack";

type CustomSlide = Slide & {
	contentType: string;
	key: number;
	placeholder?: string;
	src: string;
	type: "image" | "video" | "website";
};

type PreviewLightBoxProps = {
	id: DraggableItemProps["key"];
	open: boolean;
	setOpen: (value: boolean) => void;
};

export const PreviewLightBox = ({
	id,
	open,
	setOpen,
}: PreviewLightBoxProps) => {
	const router = useRouter();

	const renderedBookmarks = useMiscellaneousStore(
		(store) => store.renderedBookmarks,
	);

	const categorySlug = router.asPath.split("/")[1] ?? "uncategorized";

	const currentCategoryBookmarks = useMemo(
		() => renderedBookmarks[categorySlug] ?? [],
		[renderedBookmarks, categorySlug],
	);

	// Always provide all required fields and use 'index' instead of 'idx' for clarity
	const slides = useMemo(
		() =>
			currentCategoryBookmarks.map(
				(bookmark: SingleListData, index: number) => {
					const isImage = bookmark.type?.startsWith("image");
					const isVideo = bookmark.type?.startsWith("video");
					if (isVideo) {
						return {
							key: typeof bookmark.id === "number" ? bookmark.id : index,
							type: "video" as const,
							sources: [
								{
									src: bookmark.url ?? "",
									type: bookmark.type || "video/mp4",
								},
							],
							contentType: bookmark.type ?? "unknown",
						};
					} else if (isImage) {
						return {
							key: typeof bookmark.id === "number" ? bookmark.id : index,
							src: bookmark.url ?? "",
							type: "image" as const,
							contentType: bookmark.type ?? "unknown",
						};
					} else {
						return {
							key: typeof bookmark.id === "number" ? bookmark.id : index,
							src: bookmark.url ?? "",
							type: "website" as const,
							contentType: bookmark.type ?? "unknown",
							placeholder: bookmark.ogImage,
						};
					}
				},
			),
		[currentCategoryBookmarks],
	);

	const initialIndex = useMemo(
		() =>
			currentCategoryBookmarks.findIndex(
				(bookmark) => String(bookmark.id) === String(id),
			),
		[currentCategoryBookmarks, id],
	);

	const [activeIndex, setActiveIndex] = useState(initialIndex);
	const wasOpen = useRef(open);
	const lastOpenedId = useRef(id);
	const isResetting = useRef(false);

	// Only reset activeIndex when lightbox is opened or id changes while closed
	useEffect(() => {
		if ((!wasOpen.current && open) || (!open && lastOpenedId.current !== id)) {
			const index = currentCategoryBookmarks.findIndex(
				(bookmark) => String(bookmark.id) === String(id),
			);
			isResetting.current = true;
			setActiveIndex(index);
			lastOpenedId.current = id;
			setTimeout(() => {
				isResetting.current = false;
			}, 0);
		}

		wasOpen.current = open;
	}, [open, id, currentCategoryBookmarks]);

	return open ? (
		<Lightbox
			close={() => setOpen(false)}
			index={activeIndex}
			on={{
				view: ({ index }) => {
					if (!isResetting.current && open) setActiveIndex(index);
				},
			}}
			open={open}
			plugins={[Video]}
			render={{
				buttonNext: undefined,
				buttonPrev: undefined,
				slide: ({ slide }) => {
					// Let the Video plugin handle video slides
					if (slide.type === "video") return undefined;

					return (
						<div className="flex h-full w-full items-center justify-center">
							{slide.type?.startsWith("image") ? (
								<div className="flex items-center justify-center">
									<div className="relative max-w-[1200px]">
										<Image
											alt="Preview"
											className="h-auto w-auto"
											height={0}
											src={slide.src}
											unoptimized
											width={0}
										/>
									</div>
								</div>
							) : (slide as CustomSlide).contentType?.startsWith(
									"application",
							  ) ? (
								<div className="relative flex h-full w-full max-w-[1200px] items-center justify-center">
									<div
										className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-lg"
										style={{ minHeight: 500 }}
									>
										<embed
											className="h-full w-full"
											key={slide.src}
											src={slide.src}
											style={{
												border: "none",
												display: "block",
												minHeight: 500,
											}}
											type="application/pdf"
										/>
									</div>
								</div>
							) : (
								<EmbedWithFallback
									placeholder={(slide as CustomSlide).placeholder}
									src={slide.src}
								/>
							)}
						</div>
					);
				},
			}}
			slides={slides as Slide[]}
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
				muted: false,
				disablePictureInPicture: true,
				disableRemotePlayback: true,
				controlsList: "nodownload",
				crossOrigin: "anonymous",
				preload: "auto",
			}}
		/>
	) : null;
};
