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
			className="h-[80%] w-[80%] max-w-max rounded-2xl outline-none"
			style={{ aspectRatio: `${ratio}` }}
		>
			<video
				autoPlay
				className="h-full w-full rounded-2xl bg-black object-contain"
				controls
				preload="auto"
				src={slide.src}
			>
				<track kind="captions" />
			</video>
		</div>
	);
};
