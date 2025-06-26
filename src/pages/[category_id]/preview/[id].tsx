import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import Lightbox, {
	type Slide,
	type SlideVideo,
} from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";

import "yet-another-react-lightbox/styles.css";

import { useFetchBookmarkById } from "../../../async/queryHooks/bookmarks/useFetchBookmarkById";
import Spinner from "../../../components/spinner";
import { EmbedWithFallback } from "../../../pageComponents/dashboard/cardSection/objectFallBack";
import { ALL_BOOKMARKS_URL } from "../../../utils/constants";

type CustomSlide = Slide | (SlideVideo & { type: "video" });

const Preview = () => {
	type BookmarkData = {
		category_id: number;
		description: string;
		id: number;
		inserted_at: string;
		meta_data: {
			favIcon: string | null;
			height: number;
			img_caption: string | null;
			ocr: string | null;
			ogImgBlurUrl: string;
			twitter_avatar_url: string | null;
			width: number;
		};
		ogImage: string;
		screenshot: string | null;
		sort_index: number | null;
		title: string;
		trash: boolean;
		type: string;
		url: string;
		user_id: string;
	};
	type BookmarkResponse = {
		data: BookmarkData[];
		error: string | null;
	};
	const router = useRouter();
	const { id } = router.query;
	const {
		data: bookmark,
		isLoading,
		error,
	} = useFetchBookmarkById(id as string) as {
		data: BookmarkResponse | undefined;
		error: Error | null;
		isLoading: boolean;
	};

	const [isOpen, setIsOpen] = useState(true);

	const handleClose = () => {
		setIsOpen(false);
		void router.push(`/${ALL_BOOKMARKS_URL}`);
	};

	if (isLoading)
		return (
			<div className="flex h-screen items-center justify-center">
				<Spinner />
			</div>
		);
	if (error)
		return <div className="p-4 text-red-500">Error: {error.message}</div>;
	if (!bookmark) return <div className="p-4">No bookmark found</div>;

	return (
		<Lightbox
			close={handleClose}
			open={isOpen}
			plugins={[Video]}
			render={{
				buttonNext: () => null,
				buttonPrev: () => null,
				slide: () => {
					// Let the Video plugin handle video slides
					if (bookmark.data[0].type === "video/mp4") return undefined;

					return (
						<div className="flex h-full w-full items-center justify-center">
							{bookmark.data[0].type?.startsWith("image") ? (
								<div className="flex items-center justify-center">
									<div className="relative max-w-[1200px]">
										<Image
											alt="Preview"
											className="h-auto max-h-[80vh] w-auto"
											height={0}
											src={bookmark.data[0].url}
											unoptimized
											width={0}
										/>
									</div>
								</div>
							) : bookmark.data[0].type?.startsWith("application") ? (
								<div className="relative flex h-full w-full max-w-[1200px] items-center justify-center">
									<div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-lg">
										<embed
											className="block h-full w-full border-none"
											key={bookmark.data[0].url}
											src={bookmark.data[0].url}
											type="application/pdf"
										/>
									</div>
								</div>
							) : (
								<EmbedWithFallback
									placeholder={bookmark.data[0].ogImage}
									src={bookmark.data[0].url}
								/>
							)}
						</div>
					);
				},
			}}
			slides={[
				{
					src: bookmark.data[0].url,
					...(bookmark.data[0].type === "video/mp4"
						? {
								type: "video" as const,
								sources: [
									{
										src: bookmark.data[0].url,
										type: "video/mp4",
									},
								],
						  }
						: {}),
				} as CustomSlide,
			]}
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

export default Preview;
