import { type SingleListData } from "../../../types/apiTypes";

export const PreviewVideo = ({
	slide,
	videoData,
}: {
	slide: {
		src: string;
		type: string;
	};
	videoData: SingleListData;
}) => {
	const ratio =
		videoData?.meta_data?.width && videoData?.meta_data?.height
			? videoData.meta_data.width / videoData.meta_data.height
			: 16 / 9;
	return (
		<div
			className="relative max-w-[1200px]"
			style={{ aspectRatio: `${ratio}` }}
		>
			<video
				autoPlay
				className="h-auto w-auto"
				controls
				preload="auto"
				src={slide.src}
			>
				<track kind="captions" />
			</video>
		</div>
	);
};
