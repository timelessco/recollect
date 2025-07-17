import ReactPlayer from "react-player";

export const VideoPlayer = ({
	src,
	isActive,
}: {
	isActive: boolean;
	src: string;
}) => (
	<ReactPlayer
		controls
		height="100%"
		onEnded={() => {}}
		playing={isActive}
		src={src}
		style={{ maxHeight: "80vh" }}
		width="100%"
	/>
);
