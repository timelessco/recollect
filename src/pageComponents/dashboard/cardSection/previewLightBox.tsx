import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { type DraggableItemProps } from "react-aria";
import Lightbox from "yet-another-react-lightbox";

import Spinner from "../../../components/spinner";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { type SingleListData } from "../../../types/apiTypes";

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

	const slides = useMemo(
		() =>
			currentCategoryBookmarks.map((bookmark: SingleListData) => {
				const isImage = bookmark.type?.startsWith("image");

				return {
					key: bookmark.id,
					src: bookmark.url,
					...(isImage ? { type: "image" as const } : {}),
					contentType: bookmark.type,
				};
			}),
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
	const [isIframeLoading, setIsIframeLoading] = useState(true);
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		if (open) {
			setActiveIndex(initialIndex);
		}
	}, [initialIndex, open]);

	// Determine whether to show navigation buttons
	const showPrevious = activeIndex > 0;
	const showNext = activeIndex < currentCategoryBookmarks.length - 1;

	const handleIframeLoad = () => {
		setIsIframeLoading(false);
	};

	useEffect(() => {
		if (open && initialIndex !== -1) {
			setActiveIndex(initialIndex);
		}
	}, [initialIndex, open]);
	return (
		<Lightbox
			close={() => setOpen(false)}
			index={activeIndex}
			on={{
				view: ({ index }) => setActiveIndex(index),
			}}
			open={open}
			render={{
				buttonPrev: showPrevious ? undefined : () => null,
				buttonNext: showNext ? undefined : () => null,
				slide: ({ slide }) => (
					<div className="flex h-full w-full items-center justify-center">
						{slide.type?.startsWith("image") ? (
							<div className="relative h-full w-full max-w-[1200px]">
								<Image
									alt="Preview"
									className="object-contain"
									fill
									src={slide.src}
								/>
							</div>
						) : (
							<div className="relative h-full w-full max-w-[1200px]">
								{isIframeLoading && (
									<div className="absolute inset-0 flex items-center justify-center">
										<Spinner />
									</div>
								)}
								<iframe
									className={`h-full w-full ${
										isIframeLoading ? "invisible" : "visible"
									}`}
									loading="lazy"
									onError={() => setIsIframeLoading(false)}
									onLoad={handleIframeLoad}
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
			slides={slides}
			styles={{
				container: {
					backgroundColor: "rgba(255, 255, 255, 0.9)",
					backdropFilter: "blur(32px)",
				},
			}}
		/>
	);
};
