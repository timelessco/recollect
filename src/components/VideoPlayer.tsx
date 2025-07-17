import React, { useRef } from "react";
import ReactPlayer from "react-player";

export const VideoPlayer = ({
	src,
	isActive,
}: {
	isActive: boolean;
	src: string;
}) => {
	const playerRef = useRef<typeof ReactPlayer | null>(null);

	return (
		<ReactPlayer
			controls
			height="100%"
			playing={isActive}
			// @ts-expect-error ref type
			ref={playerRef}
			src={src}
			style={{ maxHeight: "80vh" }}
			width="100%"
		/>
	);
};
