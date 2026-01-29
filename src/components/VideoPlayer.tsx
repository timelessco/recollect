import React, { useRef } from "react";
import ReactPlayer from "react-player";

export const VideoPlayer = ({
	src,
	isActive,
	onError,
}: {
	isActive: boolean;
	src: string;
	onError?: () => void;
}) => {
	const playerRef = useRef<HTMLVideoElement | null>(null);

	return (
		<ReactPlayer
			height="100%"
			playing={isActive}
			ref={playerRef}
			src={src}
			style={{ maxHeight: "80vh", margin: "auto", width: "100%" }}
			onError={onError}
		/>
	);
};
