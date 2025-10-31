import React, { useRef } from "react";
import ReactPlayer from "react-player";

export const VideoPlayer = ({
	src,
	isActive,
}: {
	isActive: boolean;
	src: string;
}) => {
	const playerRef = useRef<HTMLVideoElement | null>(null);

	return (
		<ReactPlayer
			controls
			height="100%"
			playing={isActive}
			ref={playerRef}
			src={src}
			style={{ maxHeight: "80vh", margin: "auto", width: "100%" }}
		/>
	);
};
