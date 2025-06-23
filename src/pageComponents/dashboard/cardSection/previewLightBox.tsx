import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type DraggableItemProps } from "react-aria";
import Lightbox, { type Slide } from "yet-another-react-lightbox";

import { useMiscellaneousStore } from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";

import { PreviewVideo } from "./previewVideo";

type CustomSlide = Slide & {
	contentType: string;
	key: number;
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
	const slides: CustomSlide[] = useMemo(
		() =>
			currentCategoryBookmarks.map(
				(bookmark: SingleListData, index: number) => {
					const isImage = bookmark.type?.startsWith("image");
					const isVideo = bookmark.type?.startsWith("video");
					// fallback to 'website' if not image or video
					let type: "image" | "video" | "website";
					if (isImage) type = "image";
					else if (isVideo) type = "video";
					else type = "website";

					// Explicitly cast as CustomSlide
					return {
						key: typeof bookmark.id === "number" ? bookmark.id : index,
						src: bookmark.url ?? "",
						type,
						contentType: bookmark.type ?? "unknown",
					} as CustomSlide;
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
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const isResetting = useRef(false);

	// Reset activeIndex to initialIndex when Lightbox opens
	useEffect(() => {
		if (open && initialIndex !== -1) {
			isResetting.current = true;
			setActiveIndex(initialIndex);
		}
	}, [open, initialIndex]);

	// Clear isResetting after activeIndex is set
	useEffect(() => {
		if (isResetting.current) {
			const timeout = setTimeout(() => {
				isResetting.current = false;
			}, 0);
			return () => clearTimeout(timeout);
		}

		return undefined;
	}, [activeIndex]);

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
			render={{
				buttonNext: undefined,
				buttonPrev: undefined,
				slide: ({ slide }) => (
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
										style={{ border: "none", display: "block", minHeight: 500 }}
										type="application/pdf"
									/>
								</div>
							</div>
						) : slide.type?.startsWith("video") ? (
							<div className="flex h-full w-full items-center justify-center">
								<PreviewVideo
									key={slide.src}
									slide={{ src: slide.src, type: slide.type }}
									videoData={currentCategoryBookmarks[activeIndex]}
								/>
							</div>
						) : (
							<div className="relative h-full w-full max-w-[1200px]">
								<iframe
									className="h-full w-full"
									key={slide.src}
									loading="lazy"
									ref={iframeRef}
									sandbox="allow-forms allow-popups allow-scripts"
									src={slide.src}
									title="Website Preview"
								/>
							</div>
						)}
					</div>
				),
			}}
			slides={slides as Slide[]}
			styles={{
				container: {
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					backdropFilter: "blur(32px)",
				},
			}}
		/>
	) : null;
};
